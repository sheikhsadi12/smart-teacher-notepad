import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { ChatMessage } from '../types';

interface ChatProps {
  isOpen: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string, image?: string) => void;
  isLoading: boolean;
  onClose: () => void;
}

const Chat: React.FC<ChatProps> = ({ isOpen, messages, onSendMessage, isLoading, onClose }) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;
    onSendMessage(input, selectedImage || undefined);
    setInput('');
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Strip prefix for Gemini API (data:image/jpeg;base64,) if handled manually, 
        // but here we pass full string and strip in service or pass data part.
        // Service expects raw base64 usually, so let's extract it.
        const rawBase64 = base64String.split(',')[1];
        setSelectedImage(rawBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Chat Drawer */}
      <div className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white dark:bg-dark border-l border-gray-200 dark:border-gray-700 shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-darklighter">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white">
              <i className="fa-solid fa-robot" />
            </div>
            <div>
              <h2 className="font-bold text-sm">AI Teacher</h2>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs text-gray-500">Online • gemini-3</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <i className="fa-solid fa-times text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 dark:bg-black/20">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
              <i className="fa-regular fa-comments text-4xl mb-3 opacity-50" />
              <p className="text-sm">Ask me anything about your notes, math problems, or translation!</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-br-none' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-none'
              }`}>
                {msg.image && (
                   <img src={`data:image/jpeg;base64,${msg.image}`} alt="User upload" className="max-w-full h-auto rounded-lg mb-2 border border-white/20" />
                )}
                <div className={`prose text-sm ${msg.role === 'user' ? 'prose-invert text-white' : 'dark:prose-invert'}`}>
                   <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>
                     {msg.text}
                   </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 border border-gray-200 dark:border-gray-700 flex gap-1 items-center">
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-darklighter">
          {selectedImage && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
               <span className="text-xs text-gray-500 truncate flex-1">Image attached</span>
               <button onClick={() => setSelectedImage(null)} className="text-red-500 hover:text-red-600">
                 <i className="fa-solid fa-times-circle" />
               </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-400 hover:text-primary transition-colors"
              title="Upload Image"
            >
              <i className="fa-regular fa-image text-lg" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange} 
            />
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 max-h-32 min-h-[44px] bg-gray-100 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none resize-none text-sm scrollbar-hide"
              rows={1}
            />
            
            <button 
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;