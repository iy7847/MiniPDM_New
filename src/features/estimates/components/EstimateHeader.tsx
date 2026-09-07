import React from 'react';
import { Send, Printer } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import { SaveButton } from '../../../design-system/SaveButton';
import { DetailHeader } from '../../../design-system/DetailHeader';
import { Badge } from '../../../design-system/Badge';
import { StatusBadge } from '../../../design-system/StatusBadge';
import { ExcelExportButton } from '../../../shared/components/ExcelExport';
import { getCurrencySymbol } from '../../../shared/utils/currency';
import type { Estimate, EstimateItem } from '../types';

interface EstimateHeaderProps {
  isNew: boolean;
  estimate: Estimate | null;
  items: EstimateItem[];
  companyId: string | null;
  saving: boolean;
  isLocked: boolean;
  totalAmount: number;
  isForeignMode: boolean;
  onNavigateBack: () => void;
  onStatusChange: (status: string) => void;
  onSubmitEstimate: () => void;
  onOpenOrderModal: () => void;
  onOpenPreviewModal: () => void;
  onSave: () => void;
}

export const EstimateHeader: React.FC<EstimateHeaderProps> = ({
  isNew,
  estimate,
  items,
  companyId,
  saving,
  isLocked,
  totalAmount,
  isForeignMode,
  onNavigateBack,
  onStatusChange,
  onSubmitEstimate,
  onOpenOrderModal,
  onOpenPreviewModal,
  onSave
}) => {
  return (
    <DetailHeader
      title={isNew ? '새 견적 작성' : `견적 상세 (EST-${(estimate?.id || '').substring(0, 8).toUpperCase()})`}
      onBack={onNavigateBack}
      statusBadge={
        !isNew && (
          <div className="flex items-center gap-2">
            <StatusBadge type="estimate" status={estimate?.status} />
            
            {estimate?.status === 'SENT' && (
              <button
                onClick={() => onStatusChange('DRAFT')}
                className="ml-2 text-[11px] font-bold text-text-secondary hover:text-brand-500 transition-colors border border-border-default hover:border-brand-500 rounded px-2 py-0.5 bg-bg-surface flex items-center gap-1 shadow-sm"
                title="잠금을 해제하고 다시 수정합니다."
              >
                📝 수정 (잠금 해제)
              </button>
            )}
          </div>
        )
      }
      centerContent={
        <div className="flex items-center gap-4 bg-bg-elevated/30 py-1.5 px-4 rounded-lg border border-border-default/50">
          <div className="text-right flex items-center gap-3">
            <div className="text-xs text-text-secondary font-medium">총 견적 금액</div>
            <div className="text-2xl font-bold text-brand-400 leading-none">
              {totalAmount.toLocaleString(undefined, isForeignMode ? { maximumFractionDigits: 2, minimumFractionDigits: 2 } : {})} <span className="text-base font-normal text-brand-400/70 ml-0.5">{isForeignMode ? getCurrencySymbol(estimate?.currency) : '₩'}</span>
            </div>
          </div>
        </div>
      }
      primaryActions={
        <>
          {!isLocked && (
            <SaveButton 
              isSaving={saving} 
              onSave={onSave} 
            />
          )}
          {!isNew && estimate?.status === 'DRAFT' && (
            <Button variant="primary" className="flex items-center gap-2 shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_20px_rgba(14,165,233,0.5)] transition-all" onClick={onSubmitEstimate} disabled={saving}>
              <Send size={16} />
              견적 확정 및 제출
            </Button>
          )}
          {!isNew && estimate?.status === 'SENT' && (
            <Button 
              variant="primary" 
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 border-none shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] text-white transition-all" 
              onClick={onOpenOrderModal}
            >
              🚀 수주(Order) 전환
            </Button>
          )}
        </>
      }
    >
      {/* Utility Actions */}
      <div className="flex flex-col gap-1 mr-2">
        {!isNew && (
          <ExcelExportButton 
            data={items} 
            companyId={companyId || ''} 
            fileName={`${estimate?.estimate_no}_${estimate?.project_name}`}
            disabled={saving || items.length === 0}
            showForeign={isForeignMode}
            exchangeRate={estimate?.base_exchange_rate || 1}
            estimate={estimate}
            variant="ghost"
            className="text-text-secondary hover:text-text-primary gap-1 px-2 py-0.5 h-7 text-[11px] justify-start w-full"
            iconSize={14}
            label="엑셀 저장"
          />
        )}
        {!isNew && (
          <Button variant="ghost" className="text-text-secondary hover:text-text-primary gap-1 px-2 py-0.5 h-7 text-[11px] justify-start w-full" onClick={onOpenPreviewModal}>
            <Printer size={14} /> 출력
          </Button>
        )}
      </div>
      <DetailHeader.Divider />
    </DetailHeader>
  );
};
