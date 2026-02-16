import React from 'react';
import { Note } from '../types';

interface SidebarProps {
  notes: Note[];
  currentNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  notes, 
  currentNoteId, 
  onSelectNote, 
  onNewNote, 
  onDeleteNote,
  isOpen,
  toggleSidebar
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />
      
      {/* Sidebar Content */}
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-darklighter border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Smart Teacher
          </h1>
          <button onClick={toggleSidebar} className="lg:hidden text-gray-500">
            <i className="fa-solid fa-times" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <button 
            onClick={onNewNote}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95"
          >
            <i className="fa-solid fa-plus" /> New Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="text-xs font-semibold text-gray-400 uppercase px-2 mb-2">History</div>
          {notes.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm italic">No saved notes</div>
          ) : (
            notes.map(note => (
              <div 
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`group relative flex items-center p-3 mb-1 rounded-lg cursor-pointer transition-colors ${currentNoteId === note.id ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                <i className="fa-regular fa-file-lines mr-3 opacity-70" />
                <div className="truncate flex-1 text-sm font-medium">
                  {note.title || "Untitled Note"}
                </div>
                <button 
                  onClick={(e) => onDeleteNote(note.id, e)}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-center text-gray-400">
          v1.0.0 • AI-Powered
        </div>
      </div>
    </>
  );
};

export default Sidebar;