import React from 'react';
import type { TemplateBlock } from '../../../types/templateBuilder';
import { BaseInput } from '@/design-system/BaseInput';

interface CommonPropertySettingsProps {
  block: any;
  updateBlock: (id: string, updates: Partial<TemplateBlock>) => void;
  headerHeight: number;
  footerHeight: number;
}

export const CommonPropertySettings: React.FC<CommonPropertySettingsProps> = ({ 
  block, 
  updateBlock,
  headerHeight,
  footerHeight
}) => {
  const showTextStyles = !['line', 'image', 'item_table'].includes(block.type);

  return (
    <>
      <div className="mb-6 space-y-1 p-3 bg-bg-surface rounded-xl border border-border-default">
        <label className="text-[10px] font-bold text-text-muted uppercase">배치 구역 (Band)</label>
        <select 
          value={block.band}
          onChange={(e) => {
            const band = e.target.value as any;
            let y = 50;
            if (band === 'body') y = headerHeight + 50;
            if (band === 'footer') y = 1123 - footerHeight + 20;
            updateBlock(block.id, { band, x: 50, y });
          }}
          className="w-full bg-bg-base border border-border-default rounded-lg p-2 text-sm text-text-primary outline-none focus:border-brand-500"
        >
          <option value="header" className="bg-bg-surface text-text-primary">머리글 (Header)</option>
          <option value="body" className="bg-bg-surface text-text-primary">본문 (Body)</option>
          <option value="footer" className="bg-bg-surface text-text-primary">바닥글 (Footer)</option>
        </select>
        <p className="text-[10px] text-text-secondary mt-1">구역을 변경하면 해당 구역의 좌측 상단으로 이동합니다.</p>
      </div>

      {/* 공통 텍스트 설정 */}
      {showTextStyles && (
        <div className="mt-6 pt-6 border-t border-border-default space-y-4">
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">공통 텍스트 스타일</h4>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">정렬</label>
            <div className="flex bg-bg-surface border border-border-default rounded-lg p-1">
              <button
                onClick={() => updateBlock(block.id, { align: 'left' })}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${block.align === 'left' || !block.align ? 'bg-bg-elevated shadow-sm text-brand-500' : 'text-text-muted hover:text-text-primary'}`}
              >
                왼쪽
              </button>
              <button
                onClick={() => updateBlock(block.id, { align: 'center' })}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${block.align === 'center' ? 'bg-bg-elevated shadow-sm text-brand-500' : 'text-text-muted hover:text-text-primary'}`}
              >
                가운데
              </button>
              <button
                onClick={() => updateBlock(block.id, { align: 'right' })}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${block.align === 'right' ? 'bg-bg-elevated shadow-sm text-brand-500' : 'text-text-muted hover:text-text-primary'}`}
              >
                오른쪽
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">글자 크기 (px)</label>
            <BaseInput 
              type="number"
              value={block.fontSize || ''} 
              onChange={(e) => updateBlock(block.id, { fontSize: Number(e.target.value) })}
              placeholder="기본 크기"
            />
            <p className="text-[10px] text-text-secondary mt-1">블록 내부의 텍스트 크기를 일괄 조절합니다. 비워두면 기본 크기가 적용됩니다.</p>
          </div>
        </div>
      )}
    </>
  );
};
