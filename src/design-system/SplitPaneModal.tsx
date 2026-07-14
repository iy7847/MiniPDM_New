import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SplitPaneModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  initialLeftWidthPercent?: number;
  headerExtra?: React.ReactNode; // 헤더 타이틀 우측에 추가 렌더링할 요소 (드랍존 등)
}

export const SplitPaneModal: React.FC<SplitPaneModalProps> = ({
  isOpen,
  onClose,
  title,
  leftPane,
  rightPane,
  initialLeftWidthPercent = 40,
  headerExtra,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidthPercent);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      let newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constraints
      if (newLeftWidth < 20) newLeftWidth = 20;
      if (newLeftWidth > 80) newLeftWidth = 80;
      
      setLeftWidth(newLeftWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={containerRef}
        className="w-full h-full max-h-full bg-bg-base rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-border-default"
      >
        {/* Header */}
        <div className="flex items-center border-b border-border-default bg-bg-surface pr-4">
          {/* Left Header Area (Title) */}
          <div style={{ width: `${leftWidth}%` }} className="px-4 py-3 flex items-center shrink-0">
            <h2 className="text-lg font-bold text-text-primary truncate">{title}</h2>
          </div>

          {/* Spacer for the resizer */}
          <div className="w-1 shrink-0" />

          {/* Right Header Area (Extra + Close Button) */}
          <div className="flex-1 flex items-center justify-between pl-4 py-2 overflow-hidden">
            <div className="flex-1 flex items-center mr-4">
              {headerExtra}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md transition-colors shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane */}
          <div style={{ width: `${leftWidth}%` }} className="h-full overflow-hidden flex flex-col bg-bg-base">
            {leftPane}
          </div>

          {/* Resizer */}
          <div 
            className="w-1 bg-border-default hover:bg-brand-500 cursor-col-resize flex-shrink-0 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
          />

          {/* Right Pane */}
          <div style={{ width: `${100 - leftWidth}%` }} className="h-full flex-1 overflow-hidden flex flex-col bg-bg-surface relative">
            {/* An overlay when dragging to prevent iframe from capturing mouse events */}
            {isDragging && <div className="absolute inset-0 z-20 cursor-col-resize" />}
            {rightPane}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
