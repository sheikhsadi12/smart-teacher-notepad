import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Chat from './components/Chat';
import TtsPlayer from './components/TtsPlayer';
import QuickActions from './components/QuickActions';
import { Note, ChatMessage, TtsState, TtsVoice } from './types';
import { sendMessageToGemini } from './services/gemini';

const App: React.FC = () => {
  // State: Notes
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('smart_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  
  // State: UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Could detect sys pref

  // State: Recording
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // State: Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // State: TTS
  const [ttsState, setTtsState] = useState<TtsState>({
    isPlaying: false,
    isLoading: false,
    speed: 1.0,
    voice: TtsVoice.Kore,
    textToRead: ''
  });

  // Effects
  useEffect(() => {
    localStorage.setItem('smart_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handlers: Note Management
  const getCurrentNote = () => notes.find(n => n.id === currentNoteId);

  const handleUpdateNote = (content: string) => {
    if (!currentNoteId) return;
    setNotes(prev => prev.map(n => 
      n.id === currentNoteId ? { ...n, content, title: content.split('\n')[0].substring(0, 30) || 'Untitled', updatedAt: Date.now() } : n
    ));
  };

  const handleNewNote = () => {
    const newNote: Note = {
      id: uuidv4(),
      title: 'Untitled Note',
      content: '',
      updatedAt: Date.now()
    };
    setNotes([newNote, ...notes]);
    setCurrentNoteId(newNote.id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(prev => prev.filter(n => n.id !== id));
    if (currentNoteId === id) setCurrentNoteId(null);
  };

  // Handlers: Dictation
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!('webkitSpeechRecognition' in window)) {
        alert("Web Speech API not supported in this browser.");
        return;
      }
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Could toggle Bangla

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript && currentNoteId) {
          const note = getCurrentNote();
          if (note) {
             handleUpdateNote(note.content + finalTranscript);
          }
        }
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  };

  // Handlers: Chat
  const handleSendMessage = async (text: string, image?: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text,
      image,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, newMessage]);
    setIsChatLoading(true);

    try {
      // Build context from current note
      const currentNote = getCurrentNote();
      const contextPrompt = currentNote ? `\n\nContext from current note:\n${currentNote.content}\n\nUser Question: ${text}` : text;
      
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }] // Simple history, usually enough for context
      }));

      const responseText = await sendMessageToGemini(history, contextPrompt, image);
      
      const botMessage: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: "Sorry, I encountered an error. Please check your API key and connection.",
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handlers: TTS
  const handleSpeak = () => {
    const note = getCurrentNote();
    const text = note?.content || "Please select a note or type something to read.";
    
    if (!text.trim()) return;

    // Just activate the player with text; let the player handle async fetching/streaming
    setTtsState(prev => ({ 
      ...prev, 
      isPlaying: true, 
      textToRead: text 
    }));
  };

  // Handlers: Export
  const handleExport = () => {
    const note = getCurrentNote();
    if (!note) return;
    
    const htmlContent = `
      <html>
        <head><title>${note.title}</title></head>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>${note.title}</h1>
          <hr/>
          <pre style="white-space: pre-wrap; font-family: serif; font-size: 16px;">${note.content}</pre>
        </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark text-gray-900 dark:text-gray-100 font-sans">
      
      {/* Sidebar */}
      <Sidebar 
        notes={notes}
        currentNoteId={currentNoteId}
        onSelectNote={(id) => {
          setCurrentNoteId(id);
          if (window.innerWidth < 1024) setIsSidebarOpen(false);
        }}
        onNewNote={handleNewNote}
        onDeleteNote={handleDeleteNote}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-darklighter border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-gray-500">
              <i className="fa-solid fa-bars text-xl" />
            </button>
            <h2 className="text-lg font-semibold truncate max-w-[150px] sm:max-w-md">
              {getCurrentNote()?.title || "Select a Note"}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             <button 
              onClick={handleSpeak}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              title="Speak Note"
            >
              <i className="fa-solid fa-volume-high text-lg" />
            </button>
            <button 
              onClick={handleExport}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors hidden sm:block"
              title="Export"
            >
              <i className="fa-solid fa-file-export text-lg" />
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'} text-lg`} />
            </button>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <i className="fa-solid fa-robot" />
              <span className="hidden sm:inline font-medium">Ask AI</span>
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <main className="flex-1 relative overflow-hidden">
          {currentNoteId ? (
            <Editor 
              content={getCurrentNote()?.content || ''}
              onChange={handleUpdateNote}
              isRecording={isRecording}
              toggleRecording={toggleRecording}
              showPreview={showPreview}
              togglePreview={() => setShowPreview(!showPreview)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <i className="fa-solid fa-pencil text-4xl opacity-50" />
              </div>
              <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-300 mb-2">Start Teaching Smarter</h2>
              <p className="max-w-md">Create a new note or select one from the sidebar to begin using AI tools, dictation, and TTS.</p>
              <button onClick={handleNewNote} className="mt-6 text-primary font-medium hover:underline">Create Note</button>
            </div>
          )}

          {/* Quick Actions Overlay */}
          {currentNoteId && (
            <QuickActions 
              onAction={(prompt) => {
                setIsChatOpen(true);
                handleSendMessage(prompt);
              }} 
            />
          )}
        </main>
      </div>

      {/* Right Chat Sidebar */}
      <Chat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
      />

      {/* TTS Player Overlay */}
      {ttsState.isPlaying && (
        <TtsPlayer 
          ttsState={ttsState}
          setTtsState={setTtsState}
          text={ttsState.textToRead}
          onClose={() => setTtsState(prev => ({ ...prev, isPlaying: false, textToRead: '' }))}
        />
      )}
    </div>
  );
};

export default App;