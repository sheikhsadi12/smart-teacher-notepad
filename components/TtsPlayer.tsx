import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TtsState, TtsVoice } from '../types';
import { decodeBase64, decodeAudioData } from '../services/audioUtils';
import { generateSpeech } from '../services/gemini';
import { AVAILABLE_VOICES } from '../constants';

interface TtsPlayerProps {
  ttsState: TtsState;
  setTtsState: React.Dispatch<React.SetStateAction<TtsState>>;
  text: string;
  onClose: () => void;
}

interface AudioChunk {
  text: string;
  buffer: AudioBuffer | null;
  status: 'pending' | 'loading' | 'ready' | 'error';
}

const CHUNK_SIZE_LIMIT = 200; // Characters roughly

const TtsPlayer: React.FC<TtsPlayerProps> = ({ ttsState, setTtsState, text, onClose }) => {
  // Refs for Audio System
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);

  // State
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [currentChunkIdx, setCurrentChunkIdx] = useState(0);
  const [isReadyToPlay, setIsReadyToPlay] = useState(false); // At least one chunk ready
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [loadingError, setLoadingError] = useState<boolean>(false);

  // Cleanup function to safely stop audio and close context
  const cleanupAudio = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Source might have already stopped
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn("Error closing AudioContext", e);
      }
    }
    
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

  // Split text into chunks on mount or text change
  useEffect(() => {
    if (!text) return;

    // Split logic: Split by sentences, then group them
    const regex = /[^.!?\n]+[.!?\n]+/g;
    const sentences = text.match(regex) || [text];
    
    const newChunks: AudioChunk[] = [];
    let currentText = "";

    sentences.forEach((s) => {
      if ((currentText + s).length < CHUNK_SIZE_LIMIT) {
        currentText += s;
      } else {
        newChunks.push({ text: currentText.trim(), buffer: null, status: 'pending' });
        currentText = s;
      }
    });
    if (currentText.trim()) {
      newChunks.push({ text: currentText.trim(), buffer: null, status: 'pending' });
    }

    setChunks(newChunks);
    setCurrentChunkIdx(0);
    setPlaybackState('playing'); // Auto-start
    setLoadingError(false);
    
    // Initialize Audio Context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass({ sampleRate: 24000 });
    const gain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    
    audioContextRef.current = ctx;
    gainNodeRef.current = gain;
    analyserRef.current = analyser;

    return () => {
      cleanupAudio();
    };
  }, [text, cleanupAudio]);

  // Visualize Effect
  useEffect(() => {
    if (playbackState === 'playing') {
      visualize();
    } else {
      cancelVisualize();
    }
  }, [playbackState]);

  // Buffer Loader Effect
  useEffect(() => {
    const loadNextBuffer = async () => {
      // Find next pending chunk (prioritize current and next)
      const targetIdx = chunks.findIndex((c, i) => i >= currentChunkIdx && c.status === 'pending');
      
      if (targetIdx !== -1) {
        // Mark as loading
        setChunks(prev => prev.map((c, i) => i === targetIdx ? { ...c, status: 'loading' } : c));

        try {
          const chunk = chunks[targetIdx];
          const base64 = await generateSpeech(chunk.text, ttsState.voice);
          const bytes = decodeBase64(base64);
          
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            const buffer = await decodeAudioData(bytes, audioContextRef.current);
            setChunks(prev => prev.map((c, i) => i === targetIdx ? { ...c, buffer, status: 'ready' } : c));
            
            // If this was the current chunk we were waiting for, signal ready
            if (targetIdx === currentChunkIdx) {
              setIsReadyToPlay(true);
            }
          }
        } catch (err) {
          console.error("Failed to load chunk", targetIdx, err);
          setChunks(prev => prev.map((c, i) => i === targetIdx ? { ...c, status: 'error' } : c));
          if (targetIdx === currentChunkIdx) setLoadingError(true);
        }
      }
    };

    loadNextBuffer();
  }, [chunks, currentChunkIdx, ttsState.voice]);

  // Playback Logic
  useEffect(() => {
    if (playbackState === 'playing' && isReadyToPlay) {
      playCurrentChunk();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackState, isReadyToPlay, currentChunkIdx]);

  // Handle Speed Change on the fly
  useEffect(() => {
    if (sourceRef.current) {
      sourceRef.current.playbackRate.value = ttsState.speed;
    }
  }, [ttsState.speed]);

  const playCurrentChunk = async () => {
    const ctx = audioContextRef.current;
    if (!ctx || !gainNodeRef.current) return;

    // If context is suspended (paused), just resume
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.error("Error resuming context", e);
      }
      return;
    }

    const chunk = chunks[currentChunkIdx];
    if (!chunk || !chunk.buffer) return;

    if (sourceRef.current) return; // Already running for this chunk

    const source = ctx.createBufferSource();
    source.buffer = chunk.buffer;
    source.playbackRate.value = ttsState.speed;
    source.connect(gainNodeRef.current);

    source.onended = () => {
      sourceRef.current = null;
      // Move to next chunk
      if (currentChunkIdx < chunks.length - 1) {
        setCurrentChunkIdx(prev => prev + 1);
        setIsReadyToPlay(!!chunks[currentChunkIdx + 1]?.buffer);
      } else {
        // End of all chunks
        setPlaybackState('stopped');
        setCurrentChunkIdx(0);
      }
    };

    source.start(0);
    sourceRef.current = source;
  };

  const handlePause = async () => {
    if (audioContextRef.current?.state === 'running') {
      try {
        await audioContextRef.current.suspend();
        setPlaybackState('paused');
      } catch (e) {
        console.error("Error suspending context", e);
      }
    }
  };

  const handleResume = async () => {
    if (audioContextRef.current?.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        setPlaybackState('playing');
      } catch (e) {
         console.error("Error resuming context", e);
      }
    } else {
      setPlaybackState('playing'); // triggers playCurrentChunk if needed
    }
  };

  const handleClose = () => {
    cleanupAudio();
    onClose();
  };

  // Visualization
  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const analyser = analyserRef.current;
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#a855f7');
        gradient.addColorStop(1, '#6366f1');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const cancelVisualize = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  };

  // Calculate progress
  const progress = Math.round(((currentChunkIdx) / chunks.length) * 100) || 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 glass border-t border-gray-200 dark:border-gray-700 p-3 z-50 flex items-center gap-4 animate-slide-up shadow-2xl">
      {/* Visualizer */}
      <canvas ref={canvasRef} width={120} height={40} className="rounded bg-black/5 dark:bg-white/5 hidden sm:block" />

      {/* Controls */}
      <div className="flex items-center gap-3">
        {loadingError ? (
          <button onClick={() => setPlaybackState('playing')} className="text-red-500">
             <i className="fa-solid fa-triangle-exclamation" /> Retry
          </button>
        ) : (
          <button 
            onClick={playbackState === 'playing' ? handlePause : handleResume}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg active:scale-95"
            disabled={chunks.length === 0}
          >
            {(!isReadyToPlay && chunks[currentChunkIdx]?.status !== 'ready') ? (
              <i className="fa-solid fa-circle-notch fa-spin" />
            ) : (
              <i className={`fa-solid ${playbackState === 'playing' ? 'fa-pause' : 'fa-play pl-1'}`} />
            )}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-end mb-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
            Teacher AI {playbackState === 'paused' ? '(Paused)' : ''}
          </div>
          <div className="text-xs text-gray-400">
             {currentChunkIdx + 1} / {chunks.length}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
             className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
             style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs truncate text-gray-800 dark:text-gray-200 mt-1 opacity-80">
           {chunks[currentChunkIdx]?.text || "Preparing audio..."}
        </div>
      </div>

      {/* Settings */}
      <div className="flex items-center gap-3">
        {/* Speed Control */}
        <div className="hidden sm:flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">
            <span className="text-xs text-gray-500"><i className="fa-solid fa-gauge-high"></i></span>
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1" 
              value={ttsState.speed} 
              onChange={(e) => setTtsState(prev => ({...prev, speed: parseFloat(e.target.value)}))}
              className="w-16 accent-primary h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs w-6 text-center">{ttsState.speed}x</span>
        </div>
        
        {/* Close Button */}
        <button 
           onClick={handleClose} 
           className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 text-gray-400 transition-colors"
           title="Close Player"
        >
          <i className="fa-solid fa-times" />
        </button>
      </div>
    </div>
  );
};

export default TtsPlayer;