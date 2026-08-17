import React from 'react';
import { ChevronDown, ChevronRight, Type, LayoutList, FileText, Image, AlignLeft, TextQuote, Minus, Hash } from 'lucide-react';
import type { BlockType } from '../../types/templateBuilder';

interface BuilderToolbarProps {
  openGroups: Record<string, boolean>;
  toggleGroup: (group: string) => void;
  addBlock: (type: BlockType) => void;
}

export const BuilderToolbar: React.FC<BuilderToolbarProps> = ({ openGroups, toggleGroup, addBlock }) => {
  const renderToolbarButton = (id: BlockType, IconComponent: any, label: string) => (
    <div onClick={() => addBlock(id)} className="w-full p-3 bg-bg-surface border border-border-default rounded-xl flex items-center gap-3 cursor-pointer hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 transition-colors group text-text-secondary">
      <IconComponent className="w-5 h-5 group-hover:text-brand-500" />
      <span className="text-xs font-bold">{label}</span>
    </div>
  );

  return (
    <div className="w-64 border-r border-border-default bg-bg-elevated p-4 flex flex-col gap-4 overflow-y-auto">
      <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-2">블록 추가</h3>
      
      <div className="flex flex-col gap-3 mt-4">
        {/* 기본 정보 */}
        <div className="border border-border-default rounded-xl overflow-hidden bg-bg-base">
          <button onClick={() => toggleGroup('basic')} className="w-full flex items-center justify-between p-3 bg-bg-surface hover:bg-bg-overlay transition-colors">
            <span className="text-[11px] font-bold text-text-secondary">기본 정보</span>
            {openGroups.basic ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
          </button>
          {openGroups.basic && (
            <div className="p-3 flex flex-col gap-2">
              {renderToolbarButton('header', Type, '문서 제목')}
              {renderToolbarButton('receiver_info', LayoutList, '수신자 정보')}
              {renderToolbarButton('document_info', FileText, '문서 정보')}
              {renderToolbarButton('company_info', FileText, '내 회사 정보')}
              {renderToolbarButton('image', Image, '로고/직인')}
            </div>
          )}
        </div>

        {/* 상세 내역 */}
        <div className="border border-border-default rounded-xl overflow-hidden bg-bg-base">
          <button onClick={() => toggleGroup('data')} className="w-full flex items-center justify-between p-3 bg-bg-surface hover:bg-bg-overlay transition-colors">
            <span className="text-[11px] font-bold text-text-secondary">상세 내역</span>
            {openGroups.data ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
          </button>
          {openGroups.data && (
            <div className="p-3 flex flex-col gap-2">
              {renderToolbarButton('item_table', AlignLeft, '품목 테이블')}
              {renderToolbarButton('summary', AlignLeft, '합계 금액')}
            </div>
          )}
        </div>

        {/* 기타 요소 */}
        <div className="border border-border-default rounded-xl overflow-hidden bg-bg-base">
          <button onClick={() => toggleGroup('etc')} className="w-full flex items-center justify-between p-3 bg-bg-surface hover:bg-bg-overlay transition-colors">
            <span className="text-[11px] font-bold text-text-secondary">기타 요소</span>
            {openGroups.etc ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
          </button>
          {openGroups.etc && (
            <div className="p-3 flex flex-col gap-2">
              {renderToolbarButton('label', TextQuote, '텍스트 라벨')}
              {renderToolbarButton('line', Minus, '구분선')}
              {renderToolbarButton('condition', TextQuote, '발행 조건')}
              {renderToolbarButton('page_number', Hash, '페이지 번호')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
