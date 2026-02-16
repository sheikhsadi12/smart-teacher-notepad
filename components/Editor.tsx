import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  isRecording: boolean;
  toggleRecording: () => void;
  showPreview: boolean;
  togglePreview: () => void;
}

const Editor: React.FC<EditorProps> = ({ 
  content, 
  onChange, 
  isRecording, 
  toggleRecording,
  showPreview,
  togglePreview
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea logic could go here, but simple flex grow is better for this layout.

  return (
    <div className="relative flex flex-col h-full bg-white dark:bg-dark relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-darklighter">
        <div className="flex gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold">{content.length}</span> chars
        </div>
        <div className="flex gap-2">
           <button 
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
          >
            <i className={`fa-solid ${isRecording ? 'fa-microphone-lines' : 'fa-microphone'}`} />
            {isRecording ? 'Recording...' : 'Dictate'}
          </button>
          
          <button 
            onClick={togglePreview}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${showPreview ? 'bg-secondary text-white shadow-secondary/50 shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
          >
            <i className={`fa-solid ${showPreview ? 'fa-eye' : 'fa-pen-nib'}`} />
            {showPreview ? 'Preview' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex">
        {/* Editor Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="# Start typing your lecture notes here..."
          className={`flex-1 p-6 resize-none focus:outline-none bg-transparent font-mono text-base leading-relaxed text-gray-800 dark:text-gray-200 ${showPreview ? 'hidden md:block w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'}`}
          spellCheck={false}
        />

        {/* Preview Area */}
        {(showPreview || window.innerWidth >= 768) && (
          <div className={`flex-1 p-6 overflow-y-auto prose dark:prose-invert max-w-none bg-gray-50/50 dark:bg-dark/50 ${!showPreview ? 'hidden md:block w-1/2' : 'w-full'}`}>
            {content ? (
               <ReactMarkdown
               remarkPlugins={[remarkGfm]}
               rehypePlugins={[rehypeKatex]}
               components={{
                 // Custom renderer for code blocks if needed
               }}
             >
               {content}
             </ReactMarkdown>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                 <i className="fa-brands fa-markdown text-4xl mb-2" />
                 <p>Markdown Preview</p>
              </div>
            )}
           
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;