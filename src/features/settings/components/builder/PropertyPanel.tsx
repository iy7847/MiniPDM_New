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
  PageNumberPropertyForm
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
