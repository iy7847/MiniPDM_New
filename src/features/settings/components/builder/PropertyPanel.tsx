import React from 'react';
import type { TemplateBlock } from '../../types/templateBuilder';
import { BaseInput } from '@/design-system/BaseInput';

interface PropertyPanelProps {
  selectedBlock: TemplateBlock | null;
  updateBlock: (id: string, updates: Partial<TemplateBlock>) => void;
  deleteBlock: (id: string) => void;
  headerHeight: number;
  footerHeight: number;
  updateHeaderHeight: (h: number) => void;
  updateFooterHeight: (h: number) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ 
  selectedBlock, updateBlock, deleteBlock, 
  headerHeight, footerHeight, updateHeaderHeight, updateFooterHeight 
}) => {

  if (!selectedBlock) {
    return (
      <div className="w-80 border-l border-border-default bg-bg-elevated p-6 flex flex-col overflow-y-auto shrink-0">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-6">페이지 기본 속성</h3>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase">머리글(Header) 높이 (px)</label>
            <BaseInput 
              type="number"
              value={headerHeight}
              onChange={(e) => updateHeaderHeight(Number(e.target.value))}
            />
            <p className="text-[10px] text-text-secondary">모든 페이지 상단에 반복 표시되는 구역의 높이입니다.</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase">바닥글(Footer) 높이 (px)</label>
            <BaseInput 
              type="number"
              value={footerHeight}
              onChange={(e) => updateFooterHeight(Number(e.target.value))}
            />
            <p className="text-[10px] text-text-secondary">모든 페이지 하단에 반복 표시되는 구역의 높이입니다.</p>
          </div>

          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-600 font-medium">
              💡 캔버스의 블록을 선택하면 해당 블록의 상세 속성을 편집할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderProperties = () => {
    switch (selectedBlock.type) {
      case 'header':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">타이틀</label>
              <BaseInput 
                value={selectedBlock.title} 
                onChange={(e) => updateBlock(selectedBlock.id, { title: e.target.value })}
              />
            </div>
          </div>
        );
      case 'receiver_info':
        return (
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
                      checked={selectedBlock.fields?.includes(f.id)} 
                      onChange={(e) => {
                        const newFields = e.target.checked 
                          ? [...(selectedBlock.fields || []), f.id] 
                          : (selectedBlock.fields || []).filter((id: string) => id !== f.id);
                        updateBlock(selectedBlock.id, { fields: newFields });
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
      case 'document_info':
        return (
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
                      checked={selectedBlock.fields?.includes(f.id)} 
                      onChange={(e) => {
                        const newFields = e.target.checked 
                          ? [...(selectedBlock.fields || []), f.id] 
                          : (selectedBlock.fields || []).filter((id: string) => id !== f.id);
                        updateBlock(selectedBlock.id, { fields: newFields });
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
      case 'summary':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">배경색상</label>
              <input 
                type="color" 
                value={selectedBlock.highlightColor || '#f3f4f6'} 
                onChange={(e) => updateBlock(selectedBlock.id, { highlightColor: e.target.value })}
                className="w-full h-8 cursor-pointer rounded"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">옵션</label>
              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={selectedBlock.showVatNote} 
                    onChange={(e) => updateBlock(selectedBlock.id, { showVatNote: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs text-text-primary">VAT 별도 문구 표시</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={selectedBlock.showKoreanAmount} 
                    onChange={(e) => updateBlock(selectedBlock.id, { showKoreanAmount: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs text-text-primary">한글 합계 표시 (일금 ...)</span>
                </label>
              </div>
            </div>
          </div>
        );
      case 'item_table':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">테마</label>
              <select 
                value={selectedBlock.theme}
                onChange={(e) => updateBlock(selectedBlock.id, { theme: e.target.value as any })}
                className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
              >
                <option value="simple">심플 (선 없음)</option>
                <option value="bordered">테두리 있음</option>
                <option value="striped">줄무늬 배경</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase">표시할 프리셋 컬럼</label>
              <div className="grid grid-cols-2 gap-2 mt-2 bg-bg-surface p-3 rounded-xl border border-border-default">
                {['품번', '품명', '규격', '단위', '수량', '단가', '공급가액', '세액', '비고'].map(col => (
                  <label key={col} className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
                    <input 
                      type="checkbox"
                      checked={selectedBlock.columns.includes(col)}
                      onChange={(e) => {
                        const newCols = e.target.checked 
                          ? [...selectedBlock.columns, col]
                          : selectedBlock.columns.filter(c => c !== col);
                        updateBlock(selectedBlock.id, { columns: newCols });
                      }}
                      className="w-3.5 h-3.5 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
                    />
                    {col}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      case 'condition':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">조건 항목</label>
              <select 
                value={selectedBlock.conditionType}
                onChange={(e) => updateBlock(selectedBlock.id, { conditionType: e.target.value as any })}
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
                checked={selectedBlock.showTitle} 
                onChange={(e) => updateBlock(selectedBlock.id, { showTitle: e.target.checked })} 
                className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
              />
            </div>
          </div>
        );
      case 'label':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">텍스트 내용</label>
              <BaseInput 
                value={selectedBlock.text} 
                onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">폰트 두께</label>
              <select 
                value={selectedBlock.fontWeight}
                onChange={(e) => updateBlock(selectedBlock.id, { fontWeight: e.target.value as any })}
                className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
              >
                <option value="normal">보통 (Normal)</option>
                <option value="bold">굵게 (Bold)</option>
                <option value="black">매우 굵게 (Black)</option>
              </select>
            </div>
          </div>
        );
      case 'line':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">스타일</label>
              <select 
                value={selectedBlock.style}
                onChange={(e) => updateBlock(selectedBlock.id, { style: e.target.value as any })}
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
                value={selectedBlock.thickness} 
                onChange={(e) => updateBlock(selectedBlock.id, { thickness: Number(e.target.value) })}
              />
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">이미지 종류</label>
              <select 
                value={selectedBlock.imageType}
                onChange={(e) => updateBlock(selectedBlock.id, { imageType: e.target.value as any })}
                className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
              >
                <option value="seal">회사 직인 (Seal)</option>
                <option value="logo">회사 로고 (Logo)</option>
              </select>
            </div>
            <p className="text-xs text-text-muted mt-2">
              설정 탭에 등록된 {selectedBlock.imageType === 'seal' ? '직인' : '로고'} 이미지가 출력 시 이곳에 렌더링됩니다.
            </p>
          </div>
        );
      case 'company_info':
        return (
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
                      checked={selectedBlock.fields?.includes(f.id)} 
                      onChange={(e) => {
                        const newFields = e.target.checked 
                          ? [...(selectedBlock.fields || []), f.id] 
                          : (selectedBlock.fields || []).filter((id: string) => id !== f.id);
                        updateBlock(selectedBlock.id, { fields: newFields });
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
                checked={selectedBlock.showSeal} 
                onChange={(e) => updateBlock(selectedBlock.id, { showSeal: e.target.checked })} 
                className="w-4 h-4 rounded bg-white border-border-strong text-brand-500 focus:ring-brand-500"
              />
            </div>
          </div>
        );
      case 'page_number':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase">포맷</label>
              <select 
                value={selectedBlock.format}
                onChange={(e) => updateBlock(selectedBlock.id, { format: e.target.value as any })}
                className="w-full bg-bg-surface border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
              >
                <option value="{current} / {total}">1 / 2 (기본)</option>
                <option value="Page {current} / {total}">Page 1 / 2</option>
                <option value="- {current} -">- 1 -</option>
              </select>
            </div>
          </div>
        );
      default:
        return <div className="text-sm text-text-muted">설정 가능한 속성이 없습니다.</div>;
    }
  };

  return (
    <div className="w-80 border-l border-border-default bg-bg-elevated p-6 flex flex-col overflow-y-auto shrink-0">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">블록 속성</h3>
        <button 
          onClick={() => deleteBlock(selectedBlock.id)}
          className="text-xs font-bold text-danger hover:text-danger-hover transition-colors"
        >
          삭제
        </button>
      </div>
      
      <div className="mb-6 space-y-1 p-3 bg-bg-surface rounded-xl border border-border-default">
        <label className="text-[10px] font-bold text-text-muted uppercase">배치 구역 (Band)</label>
        <select 
          value={selectedBlock.band}
          onChange={(e) => {
            const band = e.target.value as any;
            let y = 50;
            if (band === 'body') y = headerHeight + 50;
            if (band === 'footer') y = 1123 - footerHeight + 20;
            updateBlock(selectedBlock.id, { band, x: 50, y });
          }}
          className="w-full bg-bg-base border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
        >
          <option value="header" className="bg-bg-surface text-text-primary">머리글 (Header)</option>
          <option value="body" className="bg-bg-surface text-text-primary">본문 (Body)</option>
          <option value="footer" className="bg-bg-surface text-text-primary">바닥글 (Footer)</option>
        </select>
        <p className="text-[10px] text-text-secondary mt-1">구역을 변경하면 해당 구역의 좌측 상단으로 이동합니다.</p>
      </div>

      {renderProperties()}

      {/* 공통 텍스트 설정 */}
      {!['line', 'image', 'item_table'].includes(selectedBlock.type) && (
        <div className="mt-6 pt-6 border-t border-border-default space-y-4">
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">공통 텍스트 스타일</h4>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">정렬</label>
            <div className="flex bg-bg-surface border border-border-default rounded-lg p-1">
              <button
                onClick={() => updateBlock(selectedBlock.id, { align: 'left' })}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${selectedBlock.align === 'left' || !selectedBlock.align ? 'bg-bg-elevated shadow-sm text-brand-500' : 'text-text-muted hover:text-text-primary'}`}
              >
                왼쪽
              </button>
              <button
                onClick={() => updateBlock(selectedBlock.id, { align: 'center' })}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${selectedBlock.align === 'center' ? 'bg-bg-elevated shadow-sm text-brand-500' : 'text-text-muted hover:text-text-primary'}`}
              >
                가운데
              </button>
              <button
                onClick={() => updateBlock(selectedBlock.id, { align: 'right' })}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${selectedBlock.align === 'right' ? 'bg-bg-elevated shadow-sm text-brand-500' : 'text-text-muted hover:text-text-primary'}`}
              >
                오른쪽
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">글자 크기 (px)</label>
            <BaseInput 
              type="number"
              value={selectedBlock.fontSize || ''} 
              onChange={(e) => updateBlock(selectedBlock.id, { fontSize: Number(e.target.value) })}
              placeholder="기본 크기"
            />
            <p className="text-[10px] text-text-secondary mt-1">블록 내부의 텍스트 크기를 일괄 조절합니다. 비워두면 기본 크기가 적용됩니다.</p>
          </div>
        </div>
      )}
    </div>
  );
};
