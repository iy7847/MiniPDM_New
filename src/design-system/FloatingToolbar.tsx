import React, { useEffect, useState } from 'react';

interface FloatingToolbarProps {
  isVisible: boolean;
  selectedCount: number;
  onClearSelection?: () => void;
  children: React.ReactNode;
}

export function FloatingToolbar({ isVisible, selectedCount, onClearSelection, children }: FloatingToolbarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!mounted) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none pt-6 transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'}`}>
      <div className="pointer-events-auto flex items-center gap-4 px-6 py-3 bg-bg-elevated border border-border-default rounded-full shadow-soft">
        <div className="flex items-center gap-2 border-r border-border-default pr-4">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-text-primary text-xs font-bold">
            {selectedCount}
          </span>
          <span className="text-text-primary font-medium text-sm">개 선택됨</span>
        </div>
        
        <div className="flex items-center gap-2">
          {children}
        </div>
        
        {onClearSelection && (
          <div className="pl-2 border-l border-border-default">
            <button 
              onClick={onClearSelection}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1"
            >
              선택 취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
