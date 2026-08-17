import React, { useState, useCallback, ReactNode } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileDropZoneProps {
  children: ReactNode;
  onFilesDrop: (files: File[]) => void;
  isLocked?: boolean;
  message?: string;
  subMessage?: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({ 
  children, 
  onFilesDrop, 
  isLocked = false,
  message = "도면 파일(PDF, 3D 등)을 여기에 놓아주세요",
  subMessage = "자동으로 분석하여 품목 리스트에 추가 또는 매칭합니다."
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLocked) setIsDragging(true);
  }, [isLocked]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (isLocked) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesDrop(files);
    }
  }, [isLocked, onFilesDrop]);

  return (
    <div 
      className="flex flex-col h-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-brand-500/10 border-4 border-dashed border-brand-500 rounded-lg flex flex-col items-center justify-center backdrop-blur-sm transition-all pointer-events-none">
          <UploadCloud size={64} className="text-brand-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-brand-500">{message}</h2>
          <p className="text-brand-500/80 mt-2">{subMessage}</p>
        </div>
      )}
      {children}
    </div>
  );
};
