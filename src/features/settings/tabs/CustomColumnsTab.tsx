import React, { useState } from 'react';
import { Card, Button, BaseInput } from '../../../design-system';
import { Plus, X, ListPlus } from 'lucide-react';
import type { CompanySettings } from '../services/settingsService';

interface CustomColumnsTabProps {
  form: Partial<CompanySettings>;
  updateForm: (key: string, value: any) => void;
}

import { toast } from '@/shared/stores/useToastStore';

export const CustomColumnsTab: React.FC<CustomColumnsTabProps> = ({ form, updateForm }) => {
  const [newColumn, setNewColumn] = useState('');
  const columns = form.custom_estimate_columns || [];

  const handleAdd = () => {
    if (!newColumn.trim()) return;
    if (columns.includes(newColumn.trim())) {
      toast.error('이미 등록된 항목입니다.');
      return;
    }
    
    updateForm('custom_estimate_columns', [...columns, newColumn.trim()]);
    setNewColumn('');
  };

  const handleRemove = (colToRemove: string) => {
    updateForm('custom_estimate_columns', columns.filter(c => c !== colToRemove));
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <Card className="p-8 border-border-default bg-bg-elevated/50 shadow-soft">
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 bg-brand-500/20 text-brand-500 rounded-xl">
            <ListPlus size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-1">견적 동적 항목(추가 비용) 관리</h3>
            <p className="text-text-secondary text-sm">
              견적서에 일괄적으로 추가할 수 있는 커스텀 비용 항목(예: 측정비, 포장비) 마스터 목록을 관리합니다.
              <br />여기 등록된 항목은 견적서 엑셀 프리셋 및 양식 디자이너에서 선택할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <div className="flex gap-2 mb-6">
            <BaseInput
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
              placeholder="예: 치수 측정비용"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button variant="primary" onClick={handleAdd}>
              <Plus size={16} className="mr-1" /> 추가
            </Button>
          </div>

          {columns.length === 0 ? (
            <div className="text-center py-8 text-text-secondary bg-bg-surface/50 border border-border-default rounded-lg border-dashed">
              등록된 동적 항목이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-bg-surface border border-border-default rounded-lg">
                  <span className="font-medium text-text-primary">{col}</span>
                  <button 
                    onClick={() => handleRemove(col)}
                    className="text-text-secondary hover:text-danger hover:bg-danger-bg p-1 rounded transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
