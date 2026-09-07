import React from 'react';
import type { TemplateBlock } from '../../types/templateBuilder';
import { BaseInput } from '@/design-system/BaseInput';
import { 
  HeaderPropertyForm,
  ReceiverInfoPropertyForm,
  DocumentInfoPropertyForm,
  SummaryPropertyForm,
  ItemTablePropertyForm,
  ConditionPropertyForm,
  LabelPropertyForm,
  LinePropertyForm,
  ImagePropertyForm,
  CompanyInfoPropertyForm,
  PageNumberPropertyForm,
  FreeTextPropertyForm,
  ApprovalLinePropertyForm,
  QrCodePropertyForm
} from './properties/BlockPropertyForms';
import { CommonPropertySettings } from './properties/CommonPropertySettings';

interface PropertyPanelProps {
  selectedBlock: TemplateBlock | null;
  updateBlock: (id: string, updates: Partial<TemplateBlock>) => void;
  deleteBlock: (id: string) => void;
  headerHeight: number;
  footerHeight: number;
  updateHeaderHeight: (h: number) => void;
  updateFooterHeight: (h: number) => void;
  orientation?: 'portrait' | 'landscape';
  setOrientation?: (o: 'portrait' | 'landscape') => void;
  watermark?: { show: boolean; opacity: number; imagePath?: string };
  setWatermark?: (w: { show: boolean; opacity: number; imagePath?: string }) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ 
  selectedBlock, updateBlock, deleteBlock, 
  headerHeight, footerHeight, updateHeaderHeight, updateFooterHeight,
  orientation = 'portrait', setOrientation,
  watermark = { show: false, opacity: 0.1, imagePath: '' }, setWatermark
}) => {

  const handleSelectImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64 && setWatermark) {
            setWatermark({ ...watermark, imagePath: base64 });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  if (!selectedBlock) {
    return (
      <div className="w-80 border-l border-border-default bg-bg-elevated p-6 flex flex-col overflow-y-auto shrink-0">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-6">용지 및 기본 설정</h3>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase">용지 방향</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setOrientation && setOrientation('portrait')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border ${orientation === 'portrait' ? 'bg-brand-500 text-white border-brand-500' : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-overlay'}`}
              >
                세로 (Portrait)
              </button>
              <button 
                onClick={() => setOrientation && setOrientation('landscape')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border ${orientation === 'landscape' ? 'bg-brand-500 text-white border-brand-500' : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-overlay'}`}
              >
                가로 (Landscape)
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase">워터마크 (배경 로고)</label>
            <div className="flex items-center gap-2 mb-2">
              <input 
                type="checkbox" 
                checked={watermark.show}
                onChange={(e) => setWatermark && setWatermark({ ...watermark, show: e.target.checked })}
              />
              <span className="text-xs font-bold text-text-primary">워터마크 표시</span>
            </div>
            {watermark.show && (
              <div className="space-y-3 p-3 bg-bg-surface rounded-xl border border-border-default">
                <div>
                  <button onClick={handleSelectImage} className="w-full py-1.5 px-3 bg-bg-elevated border border-border-strong rounded hover:bg-bg-overlay text-xs font-bold text-text-primary">
                    {watermark.imagePath ? '이미지 변경' : '이미지 선택'}
                  </button>
                  {watermark.imagePath && <p className="text-[9px] text-text-secondary mt-1 truncate">{watermark.imagePath}</p>}
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary block mb-1">투명도 (Opacity)</label>
                  <input 
                    type="range" min="0.05" max="1" step="0.05" 
                    value={watermark.opacity || 0.1} 
                    onChange={(e) => setWatermark && setWatermark({ ...watermark, opacity: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary block mb-1">크기 비율 (Scale)</label>
                  <input 
                    type="range" min="0.1" max="3" step="0.1" 
                    value={watermark.scale || 1} 
                    onChange={(e) => setWatermark && setWatermark({ ...watermark, scale: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary block mb-1">회전 (Rotation)</label>
                  <input 
                    type="range" min="-180" max="180" step="1" 
                    value={watermark.rotation || 0} 
                    onChange={(e) => setWatermark && setWatermark({ ...watermark, rotation: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

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
    const props = { block: selectedBlock, updateBlock };
    
    switch (selectedBlock.type) {
      case 'header': return <HeaderPropertyForm {...props} />;
      case 'receiver_info': return <ReceiverInfoPropertyForm {...props} />;
      case 'document_info': return <DocumentInfoPropertyForm {...props} />;
      case 'summary': return <SummaryPropertyForm {...props} />;
      case 'item_table': return <ItemTablePropertyForm {...props} />;
      case 'condition': return <ConditionPropertyForm {...props} />;
      case 'label': return <LabelPropertyForm {...props} />;
      case 'line': return <LinePropertyForm {...props} />;
      case 'image': return <ImagePropertyForm {...props} />;
      case 'company_info': return <CompanyInfoPropertyForm {...props} />;
      case 'page_number': return <PageNumberPropertyForm {...props} />;
      case 'free_text': return <FreeTextPropertyForm {...props} />;
      case 'approval_line': return <ApprovalLinePropertyForm {...props} />;
      case 'qrcode': return <QrCodePropertyForm {...props} />;
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
      
      <CommonPropertySettings 
        block={selectedBlock} 
        updateBlock={updateBlock}
        headerHeight={headerHeight}
        footerHeight={footerHeight}
      />

      <div className="mt-6">
        {renderProperties()}
      </div>
    </div>
  );
};
