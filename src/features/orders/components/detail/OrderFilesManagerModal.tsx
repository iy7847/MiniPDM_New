import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { X, Layers, Plus, HardDriveDownload, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { Card, Button, Checkbox, BaseInput } from '../../../../design-system';
import { DocumentMaskingModal } from '../../../../shared/components/DocumentMaskingModal';
import { toast } from '../../../../shared/stores/useToastStore';
import { matchFilesToItems } from '../../../../shared/utils/fileMatching';
import type { OrderItem } from '../../types';

interface OrderFilesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  addFilesToItem: (itemId: string, files: File[], replace: boolean) => Promise<void>;
  removeSingleFile: (itemId: string, fileId: string, skipConfirm?: boolean) => Promise<void>;
  removeOrderItemFiles: (itemId: string) => Promise<void>;
  removeAllOrderFilesGlobally: () => Promise<void>;
  orderId?: string;
}

export const OrderFilesManagerModal: React.FC<OrderFilesManagerModalProps> = ({
  isOpen,
  onClose,
  items,
  addFilesToItem,
  removeSingleFile,
  removeOrderItemFiles,
  removeAllOrderFilesGlobally
}) => {
  const [unmatchedFiles, setUnmatchedFiles] = useState<File[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isMaskingModalOpen, setIsMaskingModalOpen] = useState(false);
  const [maskingQueue, setMaskingQueue] = useState<{ file: any, itemId: string }[]>([]);
  const [currentMaskingIdx, setCurrentMaskingIdx] = useState(0);
  const [isDragOverOS, setIsDragOverOS] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 리셋
  useEffect(() => {
    if (!isOpen) {
      setUnmatchedFiles([]);
      setMaskingQueue([]);
      setCurrentMaskingIdx(0);
      setIsMaskingModalOpen(false);
    }
  }, [isOpen]);

  const dragCounter = useRef(0);

  const handleOSDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      dragCounter.current += 1;
      setIsDragOverOS(true);
    }
  };

  const handleOSDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
    }
  };

  const handleOSDragLeave = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragOverOS(false);
      }
    }
  };

  const handleOSDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOverOS(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      const { matched, unmatched } = matchFilesToItems(newFiles, items);
      
      if (matched.length > 0) {
        matched.forEach(match => {
          addFilesToItem(match.itemId, match.files, replaceExisting);
        });
        toast.success(`${matched.length}개 품목에 도면이 자동 배정되었습니다.`);
      }
      if (unmatched.length > 0) {
        setUnmatchedFiles(prev => [...prev, ...unmatched]);
        toast.info(`${unmatched.length}개 도면은 매칭되지 않아 미배정 목록에 추가되었습니다.`);
      }
    }
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const { matched, unmatched } = matchFilesToItems(newFiles, items);
      
      if (matched.length > 0) {
        matched.forEach(match => {
          addFilesToItem(match.itemId, match.files, replaceExisting);
        });
        toast.success(`${matched.length}개 품목에 도면이 자동 배정되었습니다.`);
      }
      if (unmatched.length > 0) {
        setUnmatchedFiles(prev => [...prev, ...unmatched]);
        toast.info(`${unmatched.length}개 도면은 매칭되지 않아 미배정 목록에 추가되었습니다.`);
      }
    }
    e.target.value = '';
  };

  const onDragEnd = async (result: any) => {
    const { source, destination } = result;

    // Dropped outside a valid droppable
    if (!destination) return;

    if (source.droppableId === 'unmatched' && destination.droppableId.startsWith('item-')) {
      const itemId = destination.droppableId.replace('item-', '');
      const fileToMove = unmatchedFiles[source.index];
      
      const newUnmatched = [...unmatchedFiles];
      newUnmatched.splice(source.index, 1);
      setUnmatchedFiles(newUnmatched);

      await addFilesToItem(itemId, [fileToMove], replaceExisting);
    }
  };

  const startSequentialMasking = () => {
    const queue: { file: any, itemId: string }[] = [];
    items.forEach(item => {
      const sourceFiles = (item.files && item.files.length > 0) ? item.files : ((item as any).estimate_items?.files || []);
      const uniqueFiles = sourceFiles.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.id === v.id)) === i);
      const pdfs = uniqueFiles.filter((f: any) => {
        const name = (f.name || f.file_name || '').toLowerCase();
        return name.endsWith('.pdf');
      });
      pdfs.forEach(pdf => queue.push({ file: pdf, itemId: item.id }));
    });

    if (queue.length === 0) {
      toast.info('배정된 PDF 도면이 없습니다.');
      return;
    }

    setMaskingQueue(queue);
    setCurrentMaskingIdx(0);
    setIsMaskingModalOpen(true);
  };

  const handleSaveMaskedPdf = async (newFile: File) => {
    const currentItem = maskingQueue[currentMaskingIdx];
    if (!currentItem) return;

    // Remove old PDF file and add the masked one (skipConfirm = true)
    if (currentItem.file.id) {
      await removeSingleFile(currentItem.itemId, currentItem.file.id, true);
    }
    await addFilesToItem(currentItem.itemId, [newFile], false);

    // Update queue so if user goes back, they see the masked version
    setMaskingQueue(prev => {
      const newQueue = [...prev];
      newQueue[currentMaskingIdx] = { ...currentItem, file: newFile };
      return newQueue;
    });

    if (currentMaskingIdx < maskingQueue.length - 1) {
      // Show next
      setCurrentMaskingIdx(prev => prev + 1);
    } else {
      toast.success('현재 마지막 도면입니다. (저장 완료)');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <Card 
        className="w-full max-w-7xl max-h-[90vh] flex flex-col bg-bg-base border-border-default shadow-2xl overflow-hidden relative"
        onDragEnter={handleOSDragEnter}
        onDragOver={handleOSDragOver}
        onDragLeave={handleOSDragLeave}
        onDrop={handleOSDrop}
      >
        {isDragOverOS && (
          <div className="absolute inset-0 z-50 bg-brand-500/10 border-4 border-dashed border-brand-500 rounded-lg flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
            <div className="bg-bg-base p-6 rounded-xl shadow-xl flex flex-col items-center">
              <Layers size={48} className="text-brand-500 mb-4 animate-bounce" />
              <p className="text-xl font-bold text-text-primary">도면 파일을 여기에 놓으세요</p>
              <p className="text-sm text-text-secondary mt-2">파일명 규칙에 따라 자동으로 품목에 배정됩니다.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border-default bg-bg-surface shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Layers className="text-brand-500" size={24} />
              수주 도면 매칭 및 관리 (Order Files Manager)
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              우측의 미배정 도면을 좌측의 품목 카드로 드래그하여 배정하세요. 
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center p-3 border-b border-border-default bg-bg-base shrink-0">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-text-primary">
              <Checkbox 
                checked={replaceExisting} 
                onChange={() => setReplaceExisting(!replaceExisting)} 
              />
              파일 배정 시 기존 도면 덮어쓰기 (리비전 교체)
            </label>
            <Button size="sm" onClick={startSequentialMasking} className="gap-2">
              <FileText size={16} /> PDF 일괄 연속 마스킹 시작
            </Button>
            <Button size="sm" variant="outline" onClick={removeAllOrderFilesGlobally} className="gap-2 text-danger border-danger/30 hover:bg-danger/10 hover:border-danger/50 transition-colors">
              <Trash2 size={16} /> 전체 품목 도면 일괄 삭제
            </Button>
          </div>
          
          <div>
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFilesSelect}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Plus size={16} className="mr-1" /> 로컬 파일 추가
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-1 overflow-hidden">
            
            {/* Left: Items List */}
            <div className="flex-1 border-r border-border-default flex flex-col min-w-0 bg-bg-surface/30">
              <div className="p-3 bg-bg-surface border-b border-border-default text-sm font-bold text-text-primary shrink-0">
                수주 품목 목록 ({items.length}건)
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map(item => {
                  const sourceFiles = (item.files && item.files.length > 0) ? item.files : ((item as any).estimate_items?.files || []);
                  const uniqueFiles = sourceFiles.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.id === v.id)) === i);
                  
                  return (
                    <div key={item.id} className="bg-bg-base border border-border-default rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-xs text-brand-500 font-bold">{item.order_item_no}</div>
                          <div className="font-bold text-text-primary mt-0.5">{item.part_name || '-'}</div>
                          <div className="text-xs text-text-secondary">{item.part_no || '-'}</div>
                        </div>
                        {uniqueFiles.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => removeOrderItemFiles(item.id)} 
                            className="h-7 px-2 text-danger opacity-60 hover:opacity-100 hover:bg-danger/10"
                          >
                            <Trash2 size={14} className="mr-1" /> 도면 전체 삭제
                          </Button>
                        )}
                      </div>
                      
                      <Droppable droppableId={`item-${item.id}`} direction="horizontal">
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.droppableProps}
                            className={`min-h-[60px] p-2 rounded border-2 border-dashed ${snapshot.isDraggingOver ? 'border-brand-500 bg-brand-500/10' : 'border-border-strong/50 bg-bg-surface'} transition-colors flex flex-wrap gap-2`}
                          >
                            {uniqueFiles.length === 0 && !snapshot.isDraggingOver && (
                              <div className="w-full flex items-center justify-center text-xs text-text-tertiary">
                                배정된 도면이 없습니다. (이곳에 드롭)
                              </div>
                            )}
                            {uniqueFiles.map((f: any) => {
                              return (
                                <div key={f.id} className="relative group flex items-center gap-2 bg-bg-base border border-border-default rounded p-1.5 pr-6 max-w-[200px]">
                                  <div className="truncate text-xs">{f.name || f.file_name}</div>
                                  <button 
                                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-danger hover:bg-danger/10 p-0.5 rounded transition-opacity"
                                    onClick={() => removeSingleFile(item.id, f.id, false)}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Unmatched Files */}
            <div className="w-[350px] flex flex-col bg-bg-base shrink-0">
              <div className="p-3 bg-bg-surface border-b border-border-default text-sm font-bold text-text-primary shrink-0 flex justify-between items-center">
                <span>미배정 도면 ({unmatchedFiles.length}건)</span>
                {unmatchedFiles.length > 0 && (
                  <Button variant="ghost" size="xs" onClick={() => setUnmatchedFiles([])} className="h-6 px-2 text-danger">
                    전체 삭제
                  </Button>
                )}
              </div>
              <Droppable droppableId="unmatched">
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 p-3 overflow-y-auto space-y-2 bg-bg-base"
                  >
                    {unmatchedFiles.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-text-tertiary gap-2 opacity-50">
                        <HardDriveDownload size={32} />
                        <span className="text-sm">업로드된 파일이 없습니다.</span>
                      </div>
                    )}
                    {unmatchedFiles.map((file, index) => (
                      <Draggable key={`${file.name}-${index}`} draggableId={`unmatched-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 bg-bg-surface border ${snapshot.isDragging ? 'border-brand-500 shadow-lg' : 'border-border-default'} rounded cursor-grab active:cursor-grabbing flex items-center justify-between group`}
                          >
                            <div className="truncate text-sm font-medium text-text-primary w-[250px]">
                              {file.name}
                            </div>
                            <button 
                              className="text-text-tertiary hover:text-danger p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const newUnmatched = [...unmatchedFiles];
                                newUnmatched.splice(index, 1);
                                setUnmatchedFiles(newUnmatched);
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      </Card>

      {/* Sequential Masking Modal */}
      {isMaskingModalOpen && maskingQueue[currentMaskingIdx] && (
        <DocumentMaskingModal
          isOpen={isMaskingModalOpen}
          onClose={() => setIsMaskingModalOpen(false)}
          file={maskingQueue[currentMaskingIdx].file}
          onSaveMaskedPdf={handleSaveMaskedPdf}
          autoCloseOnSave={false}
          title={
            <span className="text-brand-500">
              연속 마스킹 중 ({currentMaskingIdx + 1} / {maskingQueue.length}) - {maskingQueue[currentMaskingIdx].file.name || maskingQueue[currentMaskingIdx].file.file_name}
            </span>
          }
          headerActions={
            <div className="flex gap-2 mr-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentMaskingIdx === 0}
                onClick={() => setCurrentMaskingIdx(prev => prev - 1)}
              >
                이전 도면
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentMaskingIdx === maskingQueue.length - 1}
                onClick={() => setCurrentMaskingIdx(prev => prev + 1)}
              >
                다음 도면 (건너뛰기)
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
};
