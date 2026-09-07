import React, { useState } from 'react';
import { Button } from '@/design-system';
import { Plus, Check, ChevronDown } from 'lucide-react';
import { useSettingsStore } from '@/shared/stores/useSettingsStore';

interface CustomColumnDropdownProps {
  currentColumns: string[];
  onToggleColumn: (col: string) => void;
  companyId: string | null;
}

export const CustomColumnDropdown: React.FC<CustomColumnDropdownProps> = ({ currentColumns, onToggleColumn, companyId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, loadSettings } = useSettingsStore();

  React.useEffect(() => {
    if (companyId && !settings) {
      loadSettings(companyId);
    }
  }, [companyId, settings, loadSettings]);

  const masterColumns = settings?.custom_estimate_columns || [];
  
  const handleToggle = (col: string) => {
    onToggleColumn(col);
  };

  return (
    <div className="relative">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-bg-elevated border-border-default hover:bg-bg-overlay transition-colors"
      >
        <Plus size={14} />
        동적 항목 추가/해제
        <ChevronDown size={14} className="ml-1 opacity-70" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-bg-elevated border border-border-default shadow-glow rounded-xl z-50 p-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="text-xs font-bold text-text-muted mb-2 px-1">마스터 항목 (환경설정)</div>
            {masterColumns.length === 0 ? (
              <div className="text-xs text-text-secondary px-1 mb-2">등록된 마스터 항목이 없습니다.</div>
            ) : (
              <div className="space-y-1 mb-3">
                {masterColumns.map((col: string) => (
                  <button
                    key={col}
                    onClick={() => handleToggle(col)}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-bg-overlay flex items-center justify-between transition-colors"
                  >
                    <span className={currentColumns.includes(col) ? 'text-brand-500 font-medium' : ''}>{col}</span>
                    {currentColumns.includes(col) && <Check size={14} className="text-brand-500" />}
                  </button>
                ))}
              </div>
            )}
            
          </div>
        </>
      )}
    </div>
  );
};
