import React from 'react';
import { getCurrencySymbol } from '../shared/utils/currency';

interface CurrencyToggleProps {
  isForeignMode: boolean;
  onToggle: () => void;
  currency?: string;
}

export const CurrencyToggle: React.FC<CurrencyToggleProps> = ({ isForeignMode, onToggle, currency = 'USD' }) => {
  const symbol = getCurrencySymbol(currency);
  
  return (
    <button 
      type="button"
      onClick={onToggle}
      className={`relative flex items-center justify-center gap-2 h-8 px-3 rounded-md transition-all duration-300 font-medium whitespace-nowrap overflow-hidden group border ${
        isForeignMode 
          ? 'bg-brand-500 border-brand-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.4)] hover:bg-brand-400 hover:border-brand-400' 
          : 'bg-brand-500/10 border-brand-500/30 text-brand-400 hover:bg-brand-500/20 hover:border-brand-500/50 shadow-sm'
      }`}
      title={isForeignMode ? '클릭하여 원화 표시로 전환' : '클릭하여 외화 단가/금액으로 환산 표시'}
    >
      <div className={`flex items-center justify-center w-5 h-5 rounded-full transition-colors ${isForeignMode ? 'bg-white/20' : 'bg-brand-500/20 group-hover:bg-brand-500/30'}`}>
        {isForeignMode ? (
          <span className="text-[13px] font-extrabold text-white">{symbol}</span>
        ) : (
          <span className="text-[11px] font-extrabold text-brand-400">₩</span>
        )}
      </div>
      <span className="text-[12px] font-bold tracking-wide">
        {isForeignMode ? `${symbol} 적용 중` : '외화로 보기'}
      </span>
    </button>
  );
};

