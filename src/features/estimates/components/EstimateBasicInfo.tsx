import React from 'react';
import { Plus, Wand2 } from 'lucide-react';
import { BaseCombobox } from '../../../design-system/BaseCombobox';
import { NumberInput, CurrencyToggle } from '../../../design-system';
import type { Estimate } from '../types';
import type { Client } from '../../clients/types';

interface EstimateBasicInfoProps {
  estimate: Estimate | null;
  setEstimate: (e: any) => void;
  clients: Client[];
  handleClientChange: (val: string) => void;
  handleGenerateProjectName: () => void;
  showForeign: boolean;
  setShowForeign: (show: boolean) => void;
  onOpenClientModal: () => void;
  isLocked: boolean;
}

export const EstimateBasicInfo: React.FC<EstimateBasicInfoProps> = ({
  estimate,
  setEstimate,
  clients,
  handleClientChange,
  handleGenerateProjectName,
  showForeign,
  setShowForeign,
  onOpenClientModal,
  isLocked
}) => {
  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="px-6 pb-4">
      <div className="flex items-center gap-6 bg-bg-elevated/20 px-4 py-2.5 rounded-lg border border-border-default/50">
          {/* Project Name */}
          <div className="flex-1 flex items-center gap-3">
            <label className="text-xs font-medium text-text-secondary whitespace-nowrap">프로젝트</label>
            <div className="flex-1 flex items-center gap-1">
              <input 
                className="w-full bg-bg-surface border border-border-default rounded h-8 text-sm px-3 outline-none focus:border-brand-500 text-text-primary disabled:opacity-50 disabled:bg-bg-base"
                placeholder="프로젝트명" 
                value={estimate?.project_name || ''} 
                onChange={(e) => setEstimate({ ...estimate, project_name: e.target.value })} 
                disabled={isLocked}
              />
              <button onClick={handleGenerateProjectName} className="text-brand-500 hover:text-brand-400 p-1.5 bg-brand-500/10 hover:bg-brand-500/20 rounded transition-colors disabled:opacity-50" title="자동 생성" disabled={isLocked}><Wand2 size={14}/></button>
            </div>
          </div>
          
          {/* Client */}
          <div className="flex-1 flex items-center gap-3">
            <label className="text-xs font-medium text-text-secondary whitespace-nowrap">거래처</label>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-8">
                <BaseCombobox 
                  value={estimate?.client_id || ''} 
                  onChange={handleClientChange} 
                  options={clientOptions}
                  placeholder="선택..." 
                  inputClassName="w-full px-3 py-1.5 h-8 text-sm rounded border border-border-default bg-bg-surface text-text-primary focus:outline-none focus:border-brand-500 disabled:opacity-50 disabled:bg-bg-base"
                  disabled={isLocked}
                />
              </div>
              <button onClick={onOpenClientModal} className="text-brand-500 hover:text-brand-400 p-1.5 bg-brand-500/10 hover:bg-brand-500/20 rounded transition-colors disabled:opacity-50" title="신규 등록" disabled={isLocked}><Plus size={14}/></button>
            </div>
          </div>

          {/* Currency & Date */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-secondary whitespace-nowrap">통화</label>
              <select
                className="bg-bg-surface border border-border-default text-text-primary rounded h-8 text-sm px-2 outline-none focus:border-brand-500 min-w-[80px] disabled:opacity-50 disabled:bg-bg-base"
                value={estimate?.currency || 'KRW'}
                onChange={(e) => setEstimate({ ...estimate, currency: e.target.value })}
                disabled={isLocked}
              >
                <option value="KRW">KRW</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-secondary whitespace-nowrap">환율</label>
              <div className="w-[100px]">
                <NumberInput
                  value={estimate?.base_exchange_rate || 1}
                  onChange={(val) => setEstimate({ ...estimate, base_exchange_rate: val })}
                  className="!w-[100px]"
                  inputClassName="!h-8 !py-1.5 !px-2 !text-sm !bg-bg-surface disabled:opacity-50 disabled:bg-bg-base"
                  disabled={isLocked}
                />
              </div>
              {estimate?.currency !== 'KRW' && (
                <CurrencyToggle 
                  isForeignMode={showForeign} 
                  onToggle={() => setShowForeign(!showForeign)} 
                  currency={estimate?.currency} 
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-secondary whitespace-nowrap">작성일</label>
              <input 
                type="date"
                className="bg-bg-surface border border-border-default rounded h-8 text-sm px-2 outline-none focus:border-brand-500 text-text-primary disabled:opacity-50 disabled:bg-bg-base"
                value={estimate?.created_at ? estimate.created_at.substring(0, 10) : ''} 
                onChange={(e) => setEstimate({ ...estimate, created_at: e.target.value })} 
                disabled={isLocked}
              />
            </div>
          </div>
      </div>
    </div>
  );
};
