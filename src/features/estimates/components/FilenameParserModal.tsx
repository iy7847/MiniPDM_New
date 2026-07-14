import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { Badge } from '../../../design-system/Badge';
import { BaseInput } from '../../../design-system/BaseInput';
import { FileText, Box, Layers, Scissors, Trash2, Settings2 } from 'lucide-react';
import { EXT_2D, EXT_3D } from '../utils/fileMatching';
import type { EstimateItem } from '../types';
import { INITIAL_ITEM_FORM } from '../types';
import { useFilenameParser } from '../hooks/useFilenameParser';

interface FilenameParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onParseComplete?: (parsedData: EstimateItem[]) => void;
}

export const FilenameParserModal: React.FC<FilenameParserModalProps> = ({ isOpen, onClose, files, onParseComplete }) => {
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

  // Resizable split pane state
  const [leftWidth, setLeftWidth] = useState(70); // 70% width for left pane
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

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsGlobalDragOver(false);
      }
    }
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
        ...INITIAL_ITEM_FORM,
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

        <div className="p-4 border-b border-border-default flex flex-col gap-4 bg-bg-surface shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Layers className="text-brand-500" size={24} />
                스마트 도면 매칭 (Visual Matcher)
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                총 {leftGroups.reduce((acc, g) => acc + g.files.length, 0) + rightFiles.length}개의 파일을 분석했습니다. 잘못 분류된 도면은 우측에서 좌측으로 드래그 앤 드롭하여 합쳐주세요.
              </p>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleAddFiles(Array.from(e.target.files));
                  }
                  e.target.value = ''; // Reset input
                }}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <span className="font-bold mr-1">+</span> 파일 추가
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-bg-base p-3 rounded-lg border border-border-default overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <Settings2 size={18} className="text-text-secondary" />
              <span className="text-sm font-medium text-text-primary whitespace-nowrap">도번/품명 분리 기준:</span>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <Button variant={separatorMode === 'smart' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('smart')} className="whitespace-nowrap">자동(Smart)</Button>
              <Button variant={separatorMode === 'space' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('space')} className="whitespace-nowrap">공백</Button>
              <Button variant={separatorMode === 'dash' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('dash')} className="whitespace-nowrap">-</Button>
              <Button variant={separatorMode === 'underbar' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('underbar')} className="whitespace-nowrap">_</Button>
              <Button variant={separatorMode === 'bracket' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('bracket')} className="whitespace-nowrap">괄호()[]{}</Button>
              <Button variant={separatorMode === 'custom' ? 'primary' : 'outline'} size="sm" onClick={() => setSeparatorMode('custom')} className="whitespace-nowrap">직접 입력</Button>
            </div>
            
            <div className="w-32 shrink-0">
              <BaseInput
                value={customSeparator}
                onChange={(e) => setCustomSeparator(e.target.value)}
                placeholder="예: ("
                inputClassName="py-1"
              />
            </div>
          </div>
        </div>

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
                    {leftGroups.map(group => {
                      const files2D = group.files.filter(f => EXT_2D.some(ext => f.name.toLowerCase().endsWith(ext)));
                      const files3D = group.files.filter(f => EXT_3D.some(ext => f.name.toLowerCase().endsWith(ext)));
                      const has2D = files2D.length > 0;
                      const has3D = files3D.length > 0;
                      const isHovered = dragHoverGroupId === group.id;

                      return (
                        <div 
                          key={group.id} 
                          onDragOver={(e) => { e.preventDefault(); setDragHoverGroupId(group.id); }}
                          onDragLeave={(e) => { e.preventDefault(); setDragHoverGroupId(null); }}
                          onDrop={(e) => handleDropToGroup(e, group.id)}
                          className={`flex flex-col p-4 rounded-lg border transition-all gap-4 ${
                            isHovered ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/30' : 'border-border-default bg-bg-surface hover:border-brand-500/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              <BaseInput 
                                value={group.part_no}
                                onChange={(e) => handleUpdateGroup(group.id, 'part_no', e.target.value)}
                                placeholder="도번 (Part No)"
                                className="w-1/3"
                              />
                              <BaseInput 
                                value={group.part_name}
                                onChange={(e) => handleUpdateGroup(group.id, 'part_name', e.target.value)}
                                placeholder="품명 (Part Name)"
                                className="w-2/3"
                              />
                            </div>
                            
                            <div className="flex gap-2 items-center shrink-0">
                              <div className="flex gap-1.5">
                                {has2D && <Badge variant="info" className="py-1 px-2"><FileText size={14} className="mr-1"/> 2D 도면</Badge>}
                                {has3D && <Badge variant="warning" className="py-1 px-2"><Box size={14} className="mr-1"/> 3D 모델</Badge>}
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveGroup(group.id)} className="text-text-tertiary hover:text-status-danger px-2">
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-4 pl-4 border-l-2 border-border-default/50 min-w-0">
                            {/* 2D Files Column */}
                            <div className="flex-1 flex flex-col gap-2 bg-bg-base/50 p-2 rounded border border-border-default/50 min-w-0">
                              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1 shrink-0">
                                <FileText size={12}/> 2D 도면
                              </div>
                              {files2D.length === 0 ? (
                                <div className="text-xs text-text-tertiary italic p-2 text-center border border-dashed border-border-default rounded bg-bg-base/30">연결된 2D 도면 없음</div>
                              ) : (
                                files2D.map((f, i) => (
                                  <div key={i} className="text-xs text-text-primary flex items-center justify-between gap-2 bg-bg-surface p-2 rounded border border-border-default min-w-0">
                                    <span className="truncate flex-1 min-w-0" title={f.name}>{f.name}</span>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* 3D Files Column */}
                            <div className="flex-1 flex flex-col gap-2 bg-bg-base/50 p-2 rounded border border-border-default/50 min-w-0">
                              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1 shrink-0">
                                <Box size={12}/> 3D 모델
                              </div>
                              {files3D.length === 0 ? (
                                <div className="text-xs text-text-tertiary italic p-2 text-center border border-dashed border-border-default rounded bg-bg-base/30">
                                  {isHovered ? <span className="text-brand-500 font-bold">여기에 파일을 놓으세요</span> : "연결된 3D 모델 없음"}
                                </div>
                              ) : (
                                files3D.map((f, i) => (
                                  <div key={i} className="text-xs text-text-primary flex items-center justify-between gap-2 bg-bg-surface p-2 rounded border border-border-default group/file min-w-0">
                                    <span className="truncate flex-1 min-w-0" title={f.name}>{f.name}</span>
                                    <button onClick={() => handleSendToRight(group.id, f)} className="opacity-0 group-hover/file:opacity-100 text-text-tertiary hover:text-brand-500 transition-opacity p-1 shrink-0" title="우측 보관함으로 빼기">
                                      <Scissors size={14} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                      <div 
                        key={i} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({ source: 'right', fileName: f.name }));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-surface cursor-grab active:cursor-grabbing hover:border-brand-500 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                           <Box size={16} className="text-status-warning shrink-0" />
                           <span className="truncate text-xs text-text-primary" title={f.name}>{f.name}</span>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handlePromoteToNew(f)} 
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 shrink-0 ml-2" 
                          title="좌측 메인 리스트에 신규 품목으로 추가"
                        >
                          <span className="font-bold">➕</span>
                        </Button>
                      </div>
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
