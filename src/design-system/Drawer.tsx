import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({ isOpen, onClose, title, children, width = 'w-96' }: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-bg-surface border-l border-border-default shadow-smooth transition-transform duration-300 ease-in-out ${width} ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-overlay rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
}
