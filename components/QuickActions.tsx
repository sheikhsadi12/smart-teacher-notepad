import React, { useState } from 'react';
import { QuickAction } from '../types';
import { QUICK_ACTIONS } from '../constants';

interface QuickActionsProps {
  onAction: (prompt: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="flex flex-col gap-2 mb-2 animate-slide-up origin-bottom-right">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                onAction(action.prompt);
                setIsOpen(false);
              }}
              className="flex items-center justify-end gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-transform hover:scale-105 active:scale-95"
            >
              <span className="text-sm font-medium">{action.label}</span>
              <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                <i className={`fa-solid ${action.icon}`} />
              </div>
            </button>
          ))}
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white text-xl transition-all duration-300 ${isOpen ? 'bg-gray-600 rotate-45' : 'bg-secondary hover:bg-secondary/90'}`}
      >
        <i className="fa-solid fa-bolt" />
      </button>
    </div>
  );
};

export default QuickActions;