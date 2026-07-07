import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, FileText, Image, LayoutList, Type, AlignLeft, TextQuote, Minus, Eye, EyeOff, Move } from 'lucide-react';
import { Rnd } from 'react-rnd';
import { BaseInput } from '@/design-system/BaseInput';
import type { TemplateBlock, BlockType } from '../../types/templateBuilder';
import type { CustomTemplate } from '../../services/settingsService';
import { PropertyPanel } from './PropertyPanel';

// Helper to load local absolute paths in Vite dev server or Electron
const getLocalImagePath = (path: string | undefined | null) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  
  // Normalize Windows backslashes
  let normalizedPath = path.replace(/\\/g, '/');
  // Remove file:/// if present
  normalizedPath = normalizedPath.replace(/^file:\/\/\//i, '');
  
  // Use Vite's @fs prefix for local paths in dev mode
  if (import.meta.env.DEV) {
    return `/@fs/${normalizedPath}`;
  }
  
  // For production Electron, standard file:/// might be blocked by webSecurity,
  // but if webSecurity is disabled or a custom protocol is used, return the appropriate path.
  // We return file:/// for now, assuming standard Electron usage.
  return `file:///${normalizedPath}`;
};

// Block Preview Component (Extracted for Preview Mode)
const BlockPreview = ({ block, form }: { block: TemplateBlock, form: any }) => {
  switch (block.type) {
    case 'header':
      return (
        <div className="flex flex-col items-center justify-center w-full h-full relative">
          <div className="font-bold" style={{ fontSize: `${block.fontSize}px`, fontWeight: block.fontWeight === 'normal' ? 400 : block.fontWeight === 'bold' ? 700 : 900 }}>{block.title}</div>
          {block.showLogo && form?.logo_path ? (
            <img src={getLocalImagePath(form.logo_path)} alt="로고" className="absolute left-4 top-1/2 -translate-y-1/2 h-3/4 object-contain" />
          ) : block.showLogo ? (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-100 border border-gray-300 rounded text-[10px] text-gray-500">로고</div>
          ) : null}
        </div>
      );
    case 'receiver_info':
      return (
        <div className="w-full h-full p-3 bg-gray-50 border border-gray-200 rounded flex flex-col justify-center relative overflow-hidden">
          <h4 className="font-bold text-xs mb-2">수신자(고객사) 정보</h4>
          <div className="text-[10px] text-gray-600 space-y-1">
            <p>상호: (수신자 상호명)</p>
            {(block as any).fields?.includes('manager_name') && <p>담당자: (수신자 담당자명)</p>}
            {(block as any).fields?.includes('phone') && <p>연락처: (수신자 연락처)</p>}
            {(block as any).fields?.includes('email') && <p>이메일: (수신자 이메일)</p>}
            {(block as any).fields?.includes('fax') && <p>팩스: (수신자 팩스)</p>}
          </div>
        </div>
      );
    case 'item_table':
      return (
        <div className={`w-full h-full bg-white flex flex-col overflow-hidden ${block.theme === 'bordered' ? 'border border-gray-300' : ''}`}>
          <table className={`w-full text-[10px] text-center ${block.theme !== 'simple' ? 'border-collapse' : ''}`}>
            <thead>
              <tr className={block.theme === 'striped' ? 'bg-gray-100' : 'bg-gray-50'}>
                {block.columns.map((col: string) => (
                  <th key={col} className={`p-1.5 font-bold ${block.theme !== 'simple' ? 'border border-gray-300' : ''}`}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {block.columns.map((col: string) => (
                  <td key={`row1-${col}`} className={`p-1.5 text-gray-400 ${block.theme !== 'simple' ? 'border border-gray-300' : ''}`}>내용</td>
                ))}
              </tr>
              <tr className={block.theme === 'striped' ? 'bg-gray-50' : ''}>
                {block.columns.map((col: string) => (
                  <td key={`row2-${col}`} className={`p-1.5 text-gray-400 ${block.theme !== 'simple' ? 'border border-gray-300' : ''}`}>내용</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );
    case 'terms_notes':
      return (
        <div className="text-sm w-full text-left p-4 bg-gray-50 border border-gray-200 rounded h-full overflow-hidden">
          <h4 className="font-bold mb-2">발행 조건 및 비고</h4>
          {block.showPaymentTerms && <p className="text-gray-600 text-xs">- 결제 조건: {form?.default_payment_terms || '(기본 결제 조건 표시됨)'}</p>}
          {block.showIncoterms && <p className="text-gray-600 text-xs">- 인도 조건: {form?.default_incoterms || '(기본 인도 조건 표시됨)'}</p>}
          {block.showDeliveryPeriod && <p className="text-gray-600 text-xs">- 납기: {form?.default_delivery_period || '(기본 납기 표시됨)'}</p>}
          {block.showDestination && <p className="text-gray-600 text-xs">- 인도 장소: {form?.default_destination || '(기본 인도 장소 표시됨)'}</p>}
          {block.showNote && <p className="text-gray-600 text-xs mt-2 whitespace-pre-wrap">{form?.default_note || '(기본 비고 사항 내용이 여기에 표시됩니다.)'}</p>}
        </div>
      );
    case 'condition':
      const titleMap: Record<string, string> = {
        payment_terms: '결제 조건',
        incoterms: '인도 조건',
        delivery_period: '납기',
        destination: '인도 장소',
        note: '비고'
      };
      const textMap: Record<string, string> = {
        payment_terms: form?.default_payment_terms || '(기본 결제 조건)',
        incoterms: form?.default_incoterms || '(기본 인도 조건)',
        delivery_period: form?.default_delivery_period || '(기본 납기)',
        destination: form?.default_destination || '(기본 인도 장소)',
        note: form?.default_note || '(기본 비고 사항)'
      };
      return (
        <div className="text-sm w-full h-full text-left p-3 bg-gray-50 border border-gray-200 rounded overflow-hidden flex flex-col justify-center">
          {block.showTitle && <h4 className="font-bold text-xs mb-1">{titleMap[block.conditionType]}</h4>}
          <p className="text-gray-600 text-[11px] whitespace-pre-wrap">{textMap[block.conditionType]}</p>
        </div>
      );
    case 'label':
      return <div className="text-sm font-bold truncate h-full flex items-center p-2" style={{ color: (block as any).color, fontSize: (block as any).fontSize, justifyContent: (block as any).align === 'center' ? 'center' : (block as any).align === 'right' ? 'flex-end' : 'flex-start' }}>{(block as any).text}</div>;
    case 'line':
      return (
        <div className="w-full h-full flex items-center justify-center p-1">
          <div className="w-full" style={{ borderTopWidth: (block as any).thickness, borderTopStyle: (block as any).style, borderColor: (block as any).color }}></div>
        </div>
      );
    case 'image':
      const imgPath = (block as any).imageType === 'seal' ? form?.seal_path : form?.logo_path;
      if (imgPath) {
        return <img src={getLocalImagePath(imgPath)} alt={(block as any).imageType} className="w-full h-full object-contain mix-blend-multiply" />;
      }
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 border border-gray-200 border-dashed rounded text-text-muted">
          <Image className="w-6 h-6 mb-1 text-gray-400" />
          <span className="text-[10px] font-bold">{(block as any).imageType === 'seal' ? '회사 직인' : '회사 로고'}</span>
        </div>
      );
    case 'company_info':
      const sealPath = form?.seal_path;
      return (
        <div className="w-full h-full p-3 bg-gray-50 border border-gray-200 rounded flex flex-col justify-center relative overflow-hidden">
          <h4 className="font-bold text-xs mb-2">공급자(회사) 정보</h4>
          <div className="text-[10px] text-gray-600 space-y-1">
            <p>상호: {form?.name || '(주)우리회사'}</p>
            {(block as any).fields?.includes('ceo_name') && <p>대표자: {form?.ceo_name || '김대표'}</p>}
            {(block as any).fields?.includes('biz_num') && <p>사업자번호: {form?.biz_num || '123-45-67890'}</p>}
            {(block as any).fields?.includes('address') && <p>주소: {form?.address || '서울특별시 강남구 테헤란로 123'}</p>}
          </div>
          {(block as any).showSeal && (
            sealPath ? (
              <img src={getLocalImagePath(sealPath)} alt="직인" className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 object-contain mix-blend-multiply" />
            ) : (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 border-2 border-red-200 text-red-200 rounded-full flex items-center justify-center text-[8px] rotate-[-15deg]">
                직인
              </div>
            )
          )}
        </div>
      );
    default:
      return <div>Unknown Block</div>;
  }
};

const RndBlock = ({ 
  block, isSelected, onClick, form, isPreview, updateBlock, deleteBlock 
}: { 
  block: TemplateBlock, isSelected: boolean, onClick: () => void, form: any, isPreview: boolean,
  updateBlock: (id: string, updates: Partial<TemplateBlock>) => void,
  deleteBlock: (id: string) => void
}) => {
  if (isPreview) {
    return (
      <div style={{ position: 'absolute', left: block.x, top: block.y, width: block.width, height: block.height }}>
        <BlockPreview block={block} form={form} />
      </div>
    );
  }

  return (
    <Rnd
      size={{ width: block.width, height: block.height }}
      position={{ x: block.x, y: block.y }}
      onDragStop={(e, d) => updateBlock(block.id, { x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        updateBlock(block.id, {
          width: ref.style.width,
          height: ref.style.height,
          ...position,
        });
      }}
      bounds="parent"
      className={`absolute ${isSelected ? 'ring-2 ring-brand-500 z-50' : 'hover:ring-1 hover:ring-gray-300 z-10'}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      dragHandleClassName="drag-handle"
    >
      {isSelected && (
        <>
          <div className="drag-handle absolute -top-3 -left-3 w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center cursor-move shadow-md z-50">
            <Move className="w-3 h-3" />
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              deleteBlock(block.id);
            }}
            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md z-50 hover:bg-red-600 transition-colors"
            title="블록 삭제"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}
      <div className="w-full h-full overflow-hidden bg-white/80 backdrop-blur-sm border border-transparent">
        <BlockPreview block={block} form={form} />
      </div>
    </Rnd>
  );
};

interface TemplateBuilderModalProps {
  onClose: () => void;
  onSave: (name: string, layout: any) => void;
  form?: any;
  initialTemplate?: CustomTemplate;
}

const DEFAULT_IDEAL_BLOCKS: TemplateBlock[] = [
  { id: 'header_block', type: 'header', band: 'header', x: 30, y: 40, width: 734, height: 60, title: '견 적 서', showLogo: true, align: 'center', fontSize: 24, fontWeight: 'bold' } as any,
  { id: 'receiver_info_block', type: 'receiver_info', band: 'header', x: 30, y: 110, width: 350, height: 100, fields: ['manager_name', 'phone'] } as any,
  { id: 'company_info_block', type: 'company_info', band: 'header', x: 414, y: 110, width: 350, height: 100, showSeal: true, fields: ['ceo_name', 'biz_num', 'address'] } as any,
  { id: 'table_block', type: 'item_table', band: 'body', x: 30, y: 250, width: 734, height: 250, columns: ['품명', '규격', '수량', '단가', '공급가액'], theme: 'striped' } as any,
  { id: 'cond_payment', type: 'condition', band: 'footer', x: 30, y: 943, width: 350, height: 60, conditionType: 'payment_terms', showTitle: true } as any,
  { id: 'cond_delivery', type: 'condition', band: 'footer', x: 30, y: 1013, width: 350, height: 60, conditionType: 'delivery_period', showTitle: true } as any,
  { id: 'cond_note', type: 'condition', band: 'footer', x: 400, y: 943, width: 364, height: 130, conditionType: 'note', showTitle: true } as any
];

export const TemplateBuilderModal: React.FC<TemplateBuilderModalProps> = ({ onClose, onSave, form, initialTemplate }) => {
  const [templateName, setTemplateName] = useState(initialTemplate?.name || '새 커스텀 양식');
  const [blocks, setBlocks] = useState<TemplateBlock[]>(initialTemplate?.layout_json?.blocks || DEFAULT_IDEAL_BLOCKS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  
  // Band Heights
  const [headerHeight, setHeaderHeight] = useState(initialTemplate?.layout_json?.headerHeight || 220);
  const [footerHeight, setFooterHeight] = useState(initialTemplate?.layout_json?.footerHeight || 200);

  const addBlock = (type: BlockType) => {
    const newId = `block_${Date.now()}`;
    let newBlock: any = { id: newId, type, band: 'body', x: 50, y: headerHeight + 50, width: 300, height: 100 };
    
    if (type === 'header') newBlock = { ...newBlock, band: 'header', y: 50, width: 400, height: 60, title: '견적서', showLogo: true, align: 'center' };
    else if (type === 'receiver_info') newBlock = { ...newBlock, width: 300, height: 120, fields: ['manager_name', 'phone'] };
    else if (type === 'item_table') newBlock = { ...newBlock, width: 700, height: 200, columns: ['품명', '수량', '단가', '공급가액'], theme: 'bordered' };
    else if (type === 'condition') newBlock = { ...newBlock, band: 'footer', y: 1123 - footerHeight + 20, width: 300, height: 60, conditionType: 'note', showTitle: true };
    else if (type === 'label') newBlock = { ...newBlock, width: 200, height: 50, text: '새 라벨', fontSize: 16, align: 'left', fontWeight: 'bold', color: '#000000' };
    else if (type === 'line') newBlock = { ...newBlock, width: 600, height: 20, thickness: 1, style: 'solid', color: '#000000' };
    else if (type === 'image') newBlock = { ...newBlock, width: 60, height: 60, imageType: 'seal' };
    else if (type === 'company_info') newBlock = { ...newBlock, width: 300, height: 120, showSeal: true, fields: ['ceo_name', 'biz_num', 'address'] };
    
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
            <div className="w-64 border-r border-border-default bg-bg-elevated p-4 flex flex-col gap-4 overflow-y-auto">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">블록 추가</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div onClick={() => addBlock('header')} className="p-4 bg-bg-surface border border-border-default rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:text-brand-500 transition-colors group text-text-secondary">
                  <Image className="w-6 h-6 group-hover:text-brand-500" />
                  <span className="text-[11px] font-bold">헤더 (로고)</span>
                </div>
                <div onClick={() => addBlock('receiver_info')} className="p-4 bg-bg-surface border border-border-default rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:text-brand-500 transition-colors group text-text-secondary">
                  <LayoutList className="w-6 h-6 group-hover:text-brand-500" />
                  <span className="text-[11px] font-bold">수신자 정보</span>
                </div>
                <div onClick={() => addBlock('company_info')} className="p-4 bg-bg-surface border border-border-default rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:text-brand-500 transition-colors group text-text-secondary">
                  <FileText className="w-6 h-6 group-hover:text-brand-500" />
                  <span className="text-[11px] font-bold">내 회사 정보</span>
                </div>
                <div onClick={() => addBlock('item_table')} className="p-4 bg-bg-surface border border-border-default rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:text-brand-500 transition-colors group text-text-secondary">
                  <AlignLeft className="w-6 h-6 group-hover:text-brand-500" />
                  <span className="text-[11px] font-bold">품목 테이블</span>
                </div>
                <div onClick={() => addBlock('label')} className="p-4 bg-bg-surface border border-border-default rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:text-brand-500 transition-colors group text-text-secondary">
                  <TextQuote className="w-6 h-6 group-hover:text-brand-500" />
                  <span className="text-[11px] font-bold">텍스트 라벨</span>
                </div>
                <div onClick={() => addBlock('line')} className="p-4 bg-bg-surface border border-border-default rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:text-brand-500 transition-colors group text-text-secondary">
                  <Minus className="w-6 h-6 group-hover:text-brand-500" />
                  <span className="text-[11px] font-bold">구분선</span>
                </div>
                <button onClick={() => addBlock('condition')} className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border border-border-default hover:border-brand-500 hover:bg-brand-bg hover:text-brand-500 transition-all group">
                  <TextQuote className="w-6 h-6 text-text-muted group-hover:text-brand-500" />
                  <span className="text-[11px] font-bold tracking-tight">발행 조건</span>
                </button>
                <button onClick={() => addBlock('image')} className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border border-border-default hover:border-brand-500 hover:bg-brand-bg hover:text-brand-500 transition-all group">
                  <Image className="w-6 h-6 text-text-muted group-hover:text-brand-500" />
                  <span className="text-[11px] font-bold tracking-tight">로고/직인</span>
                </button>
              </div>
            </div>
          )}

          {/* Center Panel (Canvas) */}
          <div 
            className="flex-1 bg-bg-base overflow-y-auto p-12 flex justify-center" 
            onClick={() => !isPreview && setSelectedId(null)}
          >
            <div 
              className={`w-[794px] min-h-[1123px] bg-white shadow-lg relative flex flex-col text-black shrink-0 ${!isPreview ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0iI2QxZDVkYiI+PC9jaXJjbGU+Cjwvc3ZnPg==")]' : ''}`} 
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
                {!isPreview && <div className="absolute -left-16 top-[calc(var(--header-height)+8px)] text-[10px] text-green-500 font-bold bg-green-100 px-2 py-1 rounded" style={{ '--header-height': `${headerHeight}px` } as any}>BODY</div>}
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
