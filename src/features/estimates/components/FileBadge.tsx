import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Box, ExternalLink, X } from 'lucide-react';
import { Badge } from '../../../design-system/Badge';
import { toast } from '../../../shared/stores/useToastStore';

interface FileBadgeProps {
  type: '2D' | '3D';
  count: number;
  files: any[];
  onFileClick?: (file: any) => void;
  onFileRemove?: (file: any) => void;
  onRemoveAll?: () => void;
}

export const FileBadge: React.FC<FileBadgeProps> = ({ type, count, files, onFileClick, onFileRemove, onRemoveAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const openFile = async (file: any) => {
    if (onFileClick) {
      onFileClick(file);
      setIsOpen(false);
      return;
    }

    let filePath = file.file_path || file.path;
    if ((window as any).webUtils && file instanceof File) {
      try {
        filePath = (window as any).webUtils.getPathForFile(file);
      } catch (e) {
      }
    }

    if (!filePath) {
      toast.error('로컬 파일 경로를 찾을 수 없어 열 수 없습니다.');
      return;
    }

    try {
      const res = await (window as any).ipcRenderer.invoke('open-local-file', filePath);
      if (!res.success) {
        toast.error('파일을 여는 데 실패했습니다: ' + res.error);
      }
    } catch (err: any) {
      toast.error('파일을 열 수 없습니다: ' + err.message);
    }
    setIsOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (files.length === 1) {
      openFile(files[0]);
      return;
    }

    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 224; // w-56
      
      let leftPos = rect.left;
      if (leftPos + popoverWidth > window.innerWidth - 10) {
        leftPos = rect.right - popoverWidth;
      }
      if (leftPos < 10) leftPos = 10;

      setPopoverPos({
        top: rect.bottom,
        left: leftPos
      });
    }
    setIsOpen(!isOpen);
  };

  const handleRemove = (e: React.MouseEvent, file: any) => {
    e.stopPropagation();
    if (onFileRemove) {
      onFileRemove(file);
    }
  };

  const handleRemoveAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveAll) {
      onRemoveAll();
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const Icon = type === '2D' ? FileText : Box;
  const variant = type === '2D' ? 'info' : 'warning';

  return (
    <div 
      className="relative inline-flex group/badge" 
      ref={containerRef}
    >
      <Badge 
        variant={variant} 
        className="py-1 px-2 font-bold text-[10px] flex items-center cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleClick}
        title="클릭하여 파일 목록 보기"
      >
        <Icon size={12} className="mr-1" /> {type} <span className="ml-1 opacity-70">({count})</span>
      </Badge>

      {onRemoveAll && (
        <button
          onClick={handleRemoveAll}
          className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] flex items-center justify-center rounded-full bg-bg-surface border border-status-danger/30 text-status-danger opacity-0 group-hover/badge:opacity-100 shadow-md hover:bg-status-danger hover:text-white hover:border-status-danger hover:scale-110 transition-all duration-200 z-10"
          title={`${type} 파일 전체 삭제`}
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}

      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          style={{ top: popoverPos.top + 4, left: popoverPos.left }}
          className="fixed w-56 bg-bg-elevated border border-border-default rounded-md shadow-xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="text-xs font-semibold text-text-secondary px-3 py-2 border-b border-border-default bg-bg-surface flex justify-between items-center">
            <span>{type} 파일 목록</span>
            <span className="text-[10px] opacity-70">{files.length}개</span>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {files.map((f, idx) => (
              <div 
                key={f.id || idx}
                onClick={() => openFile(f)}
                className="px-3 py-2 text-sm text-text-primary hover:bg-bg-surface cursor-pointer flex items-center justify-between group transition-colors border-b border-border-default/30 last:border-0"
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 group-hover:text-brand-400">
                  <span className="truncate" title={f.name || f.file_name}>{f.name || f.file_name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary group-hover:text-brand-400" />
                  {onFileRemove && (
                    <button
                      onClick={(e) => handleRemove(e, f)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-status-danger hover:bg-status-danger/10 rounded transition-all"
                      title="이 파일 삭제"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
