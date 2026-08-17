import React from 'react';
import type { TemplateBlock } from '../../../types/templateBuilder';
import { BaseInput } from '@/design-system/BaseInput';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

interface FormProps {
  block: any;
  updateBlock: (id: string, updates: Partial<TemplateBlock>) => void;
}

export const HeaderPropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">타이틀</label>
      <BaseInput 
        value={block.title || ''} 
        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
      />
    </div>
  </div>
);

export const ReceiverInfoPropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">표시 항목</label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {[
          { id: 'manager_name', label: '담당자명' },
          { id: 'phone', label: '연락처' },
          { id: 'email', label: '이메일' },
          { id: 'fax', label: '팩스' }
        ].map(f => (
          <label key={f.id} className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={block.fields?.includes(f.id) || false} 
              onChange={(e) => {
                const newFields = e.target.checked 
                  ? [...(block.fields || []), f.id] 
                  : (block.fields || []).filter((id: string) => id !== f.id);
                updateBlock(block.id, { fields: newFields });
              }} 
              className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
            />
            <span className="text-xs text-text-primary">{f.label}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
);

export const DocumentInfoPropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">표시 항목</label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {[
          { id: 'date', label: '견적일자' },
          { id: 'estimate_no', label: '견적번호' }
        ].map(f => (
          <label key={f.id} className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={block.fields?.includes(f.id) || false} 
              onChange={(e) => {
                const newFields = e.target.checked 
                  ? [...(block.fields || []), f.id] 
                  : (block.fields || []).filter((id: string) => id !== f.id);
                updateBlock(block.id, { fields: newFields });
              }} 
              className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
            />
            <span className="text-xs text-text-primary">{f.label}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
);

export const SummaryPropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">배경색상</label>
      <input 
        type="color" 
        value={block.highlightColor || '#f3f4f6'} 
        onChange={(e) => updateBlock(block.id, { highlightColor: e.target.value })}
        className="w-full h-8 cursor-pointer rounded"
      />
    </div>
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">옵션</label>
      <div className="flex flex-col gap-2 mt-2">
        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={!!block.showVatNote} 
            onChange={(e) => updateBlock(block.id, { showVatNote: e.target.checked })}
            className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
          />
          <span className="text-xs text-text-primary">VAT 별도 문구 표시</span>
        </label>
        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={!!block.showKoreanAmount} 
            onChange={(e) => updateBlock(block.id, { showKoreanAmount: e.target.checked })}
            className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
          />
          <span className="text-xs text-text-primary">한글 합계 표시 (일금 ...)</span>
        </label>
      </div>
    </div>
  </div>
);

const AVAILABLE_COLUMNS = ['No.', '품번', '품명', '규격', '재질', '단위', '수량', '단가', '공급가액', '세액', '비고'];

export const ItemTablePropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => {
  const currentColumns = Array.isArray(block.columns) ? block.columns : [];
  
  const [orderedList, setOrderedList] = React.useState<string[]>(() => {
    const unselected = AVAILABLE_COLUMNS.filter(c => !currentColumns.includes(c));
    return [...currentColumns, ...unselected];
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const newItems = Array.from(orderedList);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    
    setOrderedList(newItems);
    
    const newActiveCols = newItems.filter(c => currentColumns.includes(c));
    updateBlock(block.id, { columns: newActiveCols });
  };

  const handleCheck = (col: string, checked: boolean) => {
    let newActiveCols: string[];
    if (checked) {
       const temp = [...currentColumns, col];
       newActiveCols = orderedList.filter(c => temp.includes(c));
    } else {
       newActiveCols = currentColumns.filter(c => c !== col);
    }
    updateBlock(block.id, { columns: newActiveCols });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-text-muted uppercase">테마</label>
        <select 
          value={block.theme || 'simple'}
          onChange={(e) => updateBlock(block.id, { theme: e.target.value as any })}
          className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
        >
          <option value="simple">심플 (선 없음)</option>
          <option value="bordered">테두리 있음</option>
          <option value="striped">줄무늬 배경</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-text-muted uppercase">표시할 프리셋 컬럼 (순서 변경 가능)</label>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="columns-list">
            {(provided) => (
              <div 
                className="flex flex-col gap-1 mt-2 bg-bg-surface p-2 rounded-xl border border-border-default max-h-[300px] overflow-y-auto"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {orderedList.map((col, index) => {
                  const isChecked = currentColumns.includes(col);
                  return (
                    <Draggable key={col} draggableId={col} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-2 p-2 rounded-lg border ${isChecked ? 'bg-brand-50 border-brand-500/30' : 'bg-bg-elevated border-border-default opacity-60'} hover:bg-bg-overlay transition-colors group`}
                        >
                          <div {...provided.dragHandleProps} className="text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing">
                            <GripVertical size={14} />
                          </div>
                          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer flex-1">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleCheck(col, e.target.checked)}
                              className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
                            />
                            <span className={isChecked ? 'text-text-primary font-bold' : ''}>{col}</span>
                          </label>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};

export const ConditionPropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">조건 항목</label>
      <select 
        value={block.conditionType || 'payment_terms'}
        onChange={(e) => updateBlock(block.id, { conditionType: e.target.value as any })}
        className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
      >
        <option value="payment_terms">결제 조건</option>
        <option value="incoterms">인도 조건</option>
        <option value="delivery_period">납기</option>
        <option value="destination">인도 장소</option>
        <option value="note">비고 사항</option>
      </select>
    </div>
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-bold text-text-muted uppercase">항목 제목 표시 여부</label>
      <input 
        type="checkbox" 
        checked={!!block.showTitle} 
        onChange={(e) => updateBlock(block.id, { showTitle: e.target.checked })} 
        className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
      />
    </div>
  </div>
);

export const LabelPropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">텍스트 내용</label>
      <BaseInput 
        value={block.text || ''} 
        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
      />
    </div>
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">폰트 두께</label>
      <select 
        value={block.fontWeight || 'normal'}
        onChange={(e) => updateBlock(block.id, { fontWeight: e.target.value as any })}
        className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
      >
        <option value="normal">보통 (Normal)</option>
        <option value="bold">굵게 (Bold)</option>
        <option value="black">매우 굵게 (Black)</option>
      </select>
    </div>
  </div>
);

export const LinePropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">스타일</label>
      <select 
        value={block.style || 'solid'}
        onChange={(e) => updateBlock(block.id, { style: e.target.value as any })}
        className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
      >
        <option value="solid">실선 (Solid)</option>
        <option value="dashed">파선 (Dashed)</option>
        <option value="dotted">점선 (Dotted)</option>
      </select>
    </div>
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">두께 (px)</label>
      <BaseInput 
        type="number"
        value={block.thickness || 1} 
        onChange={(e) => updateBlock(block.id, { thickness: Number(e.target.value) })}
      />
    </div>
  </div>
);

export const ImagePropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">이미지 종류</label>
      <select 
        value={block.imageType || 'seal'}
        onChange={(e) => updateBlock(block.id, { imageType: e.target.value as any })}
        className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
      >
        <option value="seal">회사 직인 (Seal)</option>
        <option value="logo">회사 로고 (Logo)</option>
      </select>
    </div>
    <p className="text-xs text-text-muted mt-2">
      설정 탭에 등록된 {block.imageType === 'seal' ? '직인' : '로고'} 이미지가 출력 시 이곳에 렌더링됩니다.
    </p>
  </div>
);

export const CompanyInfoPropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">표시 항목</label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {[
          { id: 'ceo_name', label: '대표자' },
          { id: 'biz_num', label: '사업자번호' },
          { id: 'address', label: '주소' }
        ].map(f => (
          <label key={f.id} className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={block.fields?.includes(f.id) || false} 
              onChange={(e) => {
                const newFields = e.target.checked 
                  ? [...(block.fields || []), f.id] 
                  : (block.fields || []).filter((id: string) => id !== f.id);
                updateBlock(block.id, { fields: newFields });
              }} 
              className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
            />
            <span className="text-xs text-text-primary">{f.label}</span>
          </label>
        ))}
      </div>
    </div>
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-bold text-text-muted uppercase">직인(도장) 함께 표시</label>
      <input 
        type="checkbox" 
        checked={!!block.showSeal} 
        onChange={(e) => updateBlock(block.id, { showSeal: e.target.checked })} 
        className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
      />
    </div>
  </div>
);

export const PageNumberPropertyForm: React.FC<FormProps> = ({ block, updateBlock }) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase">포맷</label>
      <select 
        value={block.format || '{current} / {total}'}
        onChange={(e) => updateBlock(block.id, { format: e.target.value as any })}
        className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
      >
        <option value="{current} / {total}">1 / 2 (기본)</option>
        <option value="Page {current} / {total}">Page 1 / 2</option>
        <option value="- {current} -">- 1 -</option>
      </select>
    </div>
  </div>
);
