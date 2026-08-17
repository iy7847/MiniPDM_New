import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { Badge } from '../../../design-system/Badge';
import type { EstimateItem } from '../types';
import { createInitialItemForm } from '../types';
import { useFilenameParser } from '../hooks/useFilenameParser';
import { FilenameParserSettings } from './parser/FilenameParserSettings';
import { FilenameParserLeftGroup } from './parser/FilenameParserLeftGroup';
import { FilenameParserRightFile } from './parser/FilenameParserRightFile';

interface FilenameParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onParseComplete?: (parsedData: EstimateItem[]) => void;
  companyInfo?: any;
}

export const FilenameParserModal: React.FC<FilenameParserModalProps> = ({ isOpen, onClose, files, onParseComplete, companyInfo }) => {
  const {
    leftGroups,
    rightFiles,
    dragHoverGroupId,
    setDragHoverGroupId,
    separatorMode,
    setSeparatorMode,
    customSeparator,
    setCustomSeparator,
    handleUpdateGroup,
    handlePromoteToNew,
    handleDropToGroup,
    handleSendToRight,
    handleRemoveGroup,
    handleAddFiles
  } = useFilenameParser(files, isOpen);

  const [leftWidth, setLeftWidth] = useState(70);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setLeftWidth(Math.min(Math.max(newLeftWidth, 30), 85));
  }, []);

  const handleMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleGlobalDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current += 1;
      if (dragCounter.current === 1) {
        setIsGlobalDragOver(true);
      }
    }
  }, []);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsGlobalDragOver(false);
    }
  }, []);

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsGlobalDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleAddFiles]);

  const handleConfirm = () => {
    if (!onParseComplete) {
      onClose();
      return;
    }

    const newItems: EstimateItem[] = leftGroups.map(group => {
      return {
        ...createInitialItemForm(companyInfo),
        id: crypto.randomUUID(),
        part_no: group.part_no,
        part_name: group.part_name,
        tempFiles: group.files,
        qty: 1,
      };
    });

    onParseComplete(newItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay/50 backdrop-blur-sm p-4"
      onDragEnter={handleGlobalDragEnter}
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      <Card className="w-full max-w-7xl max-h-[90vh] flex flex-col bg-bg-elevated border border-border-default shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        
        {isGlobalDragOver && (
          <div 
            className="absolute inset-0 z-[60] flex items-center justify-center bg-brand-500/10 backdrop-blur-sm rounded"
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleGlobalDrop}
          >
            <p className="text-2xl font-bold text-brand-400 bg-bg-elevated border border-brand-500/30 px-8 py-4 rounded shadow-2xl shadow-brand-500/20 pointer-events-none">
              📂 2D/3D 파일을 여기에 끌어다 놓아 추가하세요
            </p>
          </div>
        )}

        <FilenameParserSettings
          leftGroupsCount={leftGroups.reduce((acc, g) => acc + g.files.length, 0)}
          rightFilesCount={rightFiles.length}
          separatorMode={separatorMode}
          setSeparatorMode={setSeparatorMode}
          customSeparator={customSeparator}
          setCustomSeparator={setCustomSeparator}
          fileInputRef={fileInputRef}
          handleAddFiles={handleAddFiles}
        />

        <div className="p-6 overflow-y-hidden flex-1 bg-bg-base min-h-0 flex flex-col">
          <div className="flex flex-1 min-h-0" ref={containerRef}>
            
            {/* 좌측 패널 */}
            <div className="flex flex-col min-h-0 pr-6" style={{ width: `${leftWidth}%` }}>
              <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2 px-1">
                좌측: 확정된 품목 리스트
                <Badge variant="info" className="ml-1">{leftGroups.length}</Badge>
              </h3>
              <div className="overflow-y-auto flex-1 pr-2 pb-4">
                {leftGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-text-secondary border-2 border-dashed border-border-default rounded-lg">
                    <p>인식된 품목이 없습니다.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {leftGroups.map(group => (
                      <FilenameParserLeftGroup
                        key={group.id}
                        group={group}
                        dragHoverGroupId={dragHoverGroupId}
                        setDragHoverGroupId={setDragHoverGroupId}
                        handleDropToGroup={handleDropToGroup}
                        handleUpdateGroup={handleUpdateGroup}
                        handleRemoveGroup={handleRemoveGroup}
                        handleSendToRight={handleSendToRight}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Resizer Handle */}
            <div 
              className="w-4 mx-[-8px] z-10 cursor-col-resize hover:bg-brand-500/10 active:bg-brand-500/20 flex items-center justify-center group"
              onMouseDown={handleMouseDown}
              title="드래그하여 너비 조절"
            >
               <div className="w-[2px] h-full bg-border-default group-hover:bg-brand-500 transition-colors" />
            </div>

            {/* 우측 패널 */}
            <div className="flex flex-col min-h-0 pl-6" style={{ width: `${100 - leftWidth}%` }}>
              <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center justify-between px-1">
                <span className="flex items-center gap-2">우측: 3D 보관함 <Badge variant="warning" className="ml-1">{rightFiles.length}</Badge></span>
              </h3>
              <div className="overflow-y-auto flex-1 pb-4 pr-1">
                {rightFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-text-secondary text-sm border-2 border-dashed border-border-default rounded-lg">
                    보관함이 비어있습니다.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {rightFiles.map((f, i) => (
                      <FilenameParserRightFile
                        key={i}
                        file={f}
                        handlePromoteToNew={handlePromoteToNew}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="p-6 border-t border-border-default flex justify-end gap-3 bg-bg-surface mt-auto">
          <Button variant="secondary" onClick={onClose} className="px-6">취소</Button>
          <Button variant="primary" onClick={handleConfirm} className="px-6 flex items-center gap-2">
            <span>확인 및 {leftGroups.length}개 품목 리스트에 추가</span>
          </Button>
        </div>

      </Card>
    </div>
  );
};
