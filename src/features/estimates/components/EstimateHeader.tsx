import React from 'react';
import { ArrowLeft, Send, Save, Printer } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import { Badge } from '../../../design-system/Badge';
import { ExcelExportButton } from '../../../shared/components/ExcelExport';
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
    <div className="px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onNavigateBack}
          className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary">
            {isNew ? '새 견적 작성' : `견적 상세 (EST-${(estimate?.id || '').substring(0, 8).toUpperCase()})`}
          </h1>
          {!isNew && (
            <div className="flex items-center gap-2">
              {estimate?.status === 'DRAFT' && <Badge variant="warning">작성중</Badge>}
              {estimate?.status === 'SENT' && <Badge variant="default" className="flex items-center gap-1"><span className="text-[10px]">🔒</span> 제출 완료</Badge>}
              {estimate?.status === 'ORDERED' && <Badge variant="success" className="flex items-center gap-1"><span className="text-[10px]">🔒</span> 수주 완료</Badge>}
              
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
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Total Amounts */}
        <div className="flex items-center gap-4 bg-bg-elevated/30 py-1.5 px-4 rounded-lg border border-border-default/50">
            <div className="text-right flex items-center gap-3">
              <div className="text-xs text-text-secondary font-medium">총 견적 금액</div>
              <div className="text-2xl font-bold text-brand-400 leading-none">
                {totalAmount.toLocaleString(undefined, isForeignMode ? { maximumFractionDigits: 2 } : {})} <span className="text-base font-normal text-brand-400/70 ml-0.5">{isForeignMode ? estimate?.currency : '원'}</span>
              </div>
            </div>
        </div>
        
        <div className="flex space-x-2">
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

          {!isNew && (
            <Button variant="secondary" className="flex items-center gap-2" onClick={onOpenPreviewModal}>
              <Printer size={16} />
              출력 / 전송
            </Button>
          )}
          {!isNew && (
            <ExcelExportButton 
              data={items} 
              companyId={companyId || ''} 
              fileName={estimate?.project_name || '견적서'} 
            />
          )}
          {!isLocked && (
            <Button variant="outline" className="flex items-center gap-2 border-border-default hover:bg-bg-elevated" onClick={onSave} disabled={saving}>
              <Save size={16} />
              {saving ? '저장 중...' : '임시 저장'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
