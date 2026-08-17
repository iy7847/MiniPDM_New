import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, FileText, Eye, EyeOff } from 'lucide-react';
import type { TemplateBlock, BlockType } from '../../types/templateBuilder';
import type { CustomTemplate } from '../../services/settingsService';
import { PropertyPanel } from './PropertyPanel';
import { DEFAULT_IDEAL_BLOCKS } from './templateUtils';
import { RndBlock } from './RndBlock';
import { BuilderToolbar } from './BuilderToolbar';

interface TemplateBuilderModalProps {
  onClose: () => void;
  onSave: (name: string, layout: any) => void;
  form?: any;
  initialTemplate?: CustomTemplate;
}

export const TemplateBuilderModal: React.FC<TemplateBuilderModalProps> = ({ onClose, onSave, form, initialTemplate }) => {
  const [templateName, setTemplateName] = useState(initialTemplate?.name || '새 커스텀 양식');
  const [blocks, setBlocks] = useState<TemplateBlock[]>(() => {
    const initialBlocks = initialTemplate?.layout_json?.blocks || DEFAULT_IDEAL_BLOCKS;
    return initialBlocks.map((b: any) => ({
      ...b,
      // Ensure blocks don't render outside the canvas (which causes the "overlapping paper" visual bug)
      x: Math.max(0, Math.min(b.x, 794 - parseInt(String(b.width || 100).replace('px', '')))),
      y: Math.max(0, Math.min(b.y, 1123 - parseInt(String(b.height || 50).replace('px', ''))))
    }));
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    basic: true,
    data: true,
    etc: true
  });

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };
  
  // Band Heights
  const [headerHeight, setHeaderHeight] = useState(initialTemplate?.layout_json?.headerHeight || 220);
  const [footerHeight, setFooterHeight] = useState(initialTemplate?.layout_json?.footerHeight || 200);

  const addBlock = (type: BlockType) => {
    const newId = `block_${Date.now()}`;
    let newBlock: any = { id: newId, type, band: 'body', x: 50, y: headerHeight + 50, width: 300, height: 100 };
    
    if (type === 'header') newBlock = { ...newBlock, band: 'header', y: 50, width: 400, height: 60, title: '견적서', align: 'center' };
    else if (type === 'receiver_info') newBlock = { ...newBlock, width: 300, height: 120, fields: ['manager_name', 'phone'] };
    else if (type === 'item_table') newBlock = { ...newBlock, width: 700, height: 200, columns: ['품명', '수량', '단가', '공급가액'], theme: 'bordered' };
    else if (type === 'condition') newBlock = { ...newBlock, band: 'footer', y: 1123 - footerHeight + 20, width: 300, height: 60, conditionType: 'note', showTitle: true };
    else if (type === 'label') newBlock = { ...newBlock, width: 200, height: 50, text: '새 라벨', fontSize: 16, align: 'left', fontWeight: 'bold', color: '#000000' };
    else if (type === 'line') newBlock = { ...newBlock, width: 600, height: 20, thickness: 1, style: 'solid', color: '#000000' };
    else if (type === 'image') newBlock = { ...newBlock, width: 60, height: 60, imageType: 'seal' };
    else if (type === 'company_info') newBlock = { ...newBlock, width: 300, height: 120, showSeal: true, fields: ['ceo_name', 'biz_num', 'address'] };
    else if (type === 'document_info') newBlock = { ...newBlock, width: 300, height: 50, fields: ['date', 'estimate_no'] };
    else if (type === 'summary') newBlock = { ...newBlock, width: 600, height: 100, highlightColor: '#f3f4f6', showVatNote: true, showKoreanAmount: true };
    else if (type === 'page_number') newBlock = { ...newBlock, band: 'footer', y: 1123 - footerHeight + 100, width: 150, height: 30, format: '{current} / {total}', align: 'center', fontSize: 12, color: '#666666' };
    
    setBlocks([...blocks, newBlock]);
    setSelectedId(newId);
  };

  const startHeaderResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = headerHeight;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      setHeaderHeight(Math.max(50, startHeight + deltaY));
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startFooterResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = footerHeight;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY; // drag up increases footer height
      setFooterHeight(Math.max(50, startHeight + deltaY));
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const updateBlock = (id: string, updates: Partial<TemplateBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } as TemplateBlock : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      alert('양식 이름을 입력해주세요.');
      return;
    }
    onSave(templateName, {
      headerHeight,
      footerHeight,
      blocks
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-bg-base/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-bg-surface w-full max-w-[1600px] h-[90vh] rounded-3xl shadow-glow border border-border-default flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Top Header */}
        <div className="h-16 border-b border-border-default flex items-center justify-between px-6 bg-bg-elevated shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-bg rounded-lg">
              <FileText className="w-5 h-5 text-brand-500" />
            </div>
            <input 
              type="text" 
              value={templateName} 
              onChange={e => setTemplateName(e.target.value)} 
              className="text-lg font-black text-text-primary tracking-tight bg-transparent border-b-2 border-transparent hover:border-border-default focus:border-brand-500 transition-colors outline-none w-64 px-1 py-0.5" 
              placeholder="양식 이름 입력..." 
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-overlay rounded-xl transition-all">
              <X className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsPreview(!isPreview)} 
              className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all ${isPreview ? 'bg-bg-surface text-brand-500 border border-brand-500' : 'bg-bg-overlay text-text-primary hover:bg-bg-surface border border-border-default'}`}
            >
              {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isPreview ? '편집 모드' : '미리보기'}
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-soft transition-all">
              <Save className="w-4 h-4" />
              저장하기
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel (Toolbar) */}
          {!isPreview && (
            <BuilderToolbar 
              openGroups={openGroups} 
              toggleGroup={toggleGroup} 
              addBlock={addBlock} 
            />
          )}

          {/* Center Panel (Canvas) */}
          <div 
            className="flex-1 bg-bg-base overflow-y-auto p-12 flex justify-center items-start" 
            onClick={() => !isPreview && setSelectedId(null)}
          >
            <div className="pb-12 shrink-0">
              <div 
                className={`w-[794px] h-[1123px] bg-white shadow-lg relative flex flex-col text-black shrink-0 ${!isPreview ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0iI2QxZDVkYiI+PC9jaXJjbGU+Cjwvc3ZnPg==")]' : ''}`} 
                onClick={(e) => e.stopPropagation()}
              >
              
              {/* Visual Band Backgrounds (Not containers) */}
              <div style={{ height: headerHeight }} className={`relative w-full shrink-0 ${!isPreview ? 'border-b-2 border-dashed border-blue-300 bg-blue-50/20' : ''}`}>
                {!isPreview && <div className="absolute -left-20 top-2 text-[10px] text-blue-500 font-bold bg-blue-100 px-2 py-1 rounded">HEADER</div>}
                {/* Drag resizer for header */}
                {!isPreview && (
                  <div 
                    className="absolute -bottom-2 left-0 w-full h-4 cursor-row-resize z-40 hover:bg-blue-500/20"
                    onMouseDown={startHeaderResize}
                    title="드래그하여 머리글 구역 높이 조절"
                  />
                )}
              </div>

              <div className={`flex-1 relative w-full shrink-0 ${!isPreview ? 'border-b-2 border-dashed border-green-300 bg-green-50/10' : ''}`}>
                {!isPreview && <div className="absolute -left-16 top-2 text-[10px] text-green-500 font-bold bg-green-100 px-2 py-1 rounded">BODY</div>}
              </div>

              <div style={{ height: footerHeight }} className={`relative w-full shrink-0 ${!isPreview ? 'bg-purple-50/20' : ''}`}>
                {!isPreview && <div className="absolute -left-20 bottom-2 text-[10px] text-purple-500 font-bold bg-purple-100 px-2 py-1 rounded">FOOTER</div>}
                {/* Drag resizer for footer */}
                {!isPreview && (
                  <div 
                    className="absolute -top-2 left-0 w-full h-4 cursor-row-resize z-40 hover:bg-purple-500/20"
                    onMouseDown={startFooterResize}
                    title="드래그하여 바닥글 구역 높이 조절"
                  />
                )}
              </div>

              {/* All Blocks mapped at the root level so they can be dragged anywhere */}
              {blocks.map(block => (
                <RndBlock 
                  key={block.id} 
                  block={block} 
                  isSelected={selectedId === block.id} 
                  onClick={() => setSelectedId(block.id)} 
                  form={form} 
                  isPreview={isPreview} 
                  updateBlock={(id, updates) => {
                    let finalUpdates = { ...updates };
                    if (updates.y !== undefined) {
                      // Determine which band it was dropped in based on absolute Y
                      let newBand: 'header' | 'body' | 'footer' = 'body';
                      if (updates.y < headerHeight) newBand = 'header';
                      else if (updates.y >= (1123 - footerHeight)) newBand = 'footer';
                      finalUpdates.band = newBand;
                    }
                    updateBlock(id, finalUpdates);
                  }} 
                  deleteBlock={deleteBlock}
                />
              ))}

            </div>
            </div>
          </div>

          {/* Right Panel (Properties) */}
          {!isPreview && (
            <PropertyPanel 
              selectedBlock={blocks.find(b => b.id === selectedId) || null} 
              updateBlock={updateBlock} 
              deleteBlock={deleteBlock}
              headerHeight={headerHeight}
              footerHeight={footerHeight}
              updateHeaderHeight={setHeaderHeight}
              updateFooterHeight={setFooterHeight}
            />
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
