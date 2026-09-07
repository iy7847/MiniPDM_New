import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/design-system/Button';
import { BaseInput } from '@/design-system/BaseInput';
import { BaseCombobox } from '@/design-system/BaseCombobox';
import { CurrencyInput } from '@/design-system/CurrencyInput';
import { supabase } from '@/shared/services/supabase';
import type { Material, ItemSupplier, PostProcessing, HeatTreatment } from '@/shared/types/material';

export type ItemType = 'MATERIAL' | 'POST_PROCESSING' | 'HEAT_TREATMENT';

export interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ItemType;
  initialData?: any;
  onSave: (data: any, suppliers: Partial<ItemSupplier>[]) => void;
  isReadOnly?: boolean;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  type,
  initialData,
  onSave,
  isReadOnly = false,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [suppliers, setSuppliers] = useState<Partial<ItemSupplier>[]>([]);
  const [clientOptions, setClientOptions] = useState<{value: string, label: string}[]>([]);

  useEffect(() => {
    async function fetchClients() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (!profile?.company_id) return;
      
      const { data } = await supabase
        .from('clients')
        .select('id, name, client_type')
        .eq('company_id', profile.company_id)
        .order('name');
        
      if (data) {
        // Filter locally to avoid DB enum/string mismatch issues
        const validClients = data.filter((c: any) => 
          ['SUPPLIER', 'BOTH', '매입처', '매출/매입처', '매입/외주처'].includes(c.client_type)
        );
        
        setClientOptions(
          validClients.map((c: any) => ({ value: c.id, label: c.name }))
        );
      }
    }

    if (isOpen) {
      fetchClients();
    }

    if (initialData) {
      setFormData(initialData);
      setSuppliers(initialData.suppliers || []);
    } else {
      setFormData({});
      setSuppliers([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData, suppliers);
    onClose();
  };

  const titleMap = {
    MATERIAL: '자재',
    POST_PROCESSING: '후처리',
    HEAT_TREATMENT: '열처리'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-bg-surface w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col relative z-10 overflow-hidden ring-1 ring-border-default/50">
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-text-primary">
              {initialData ? `${titleMap[type]} 수정` : `${titleMap[type]} 등록`}
            </h2>
            {isReadOnly && (
              <span className="px-2 py-0.5 rounded text-xs bg-bg-surface text-text-secondary border border-border-default font-medium">
                조회 전용
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <fieldset disabled={isReadOnly} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <BaseInput 
              label="코드" 
              value={formData.code || ''} 
              onChange={e => handleChange('code', e.target.value)} 
              placeholder="자동 생성 또는 입력"
            />
            <BaseInput 
              label={`${titleMap[type]}명`} 
              value={formData.name || ''} 
              onChange={e => handleChange('name', e.target.value)} 
              placeholder={type === 'MATERIAL' ? '예: S45C' : '예: 흑색아노다이징'}
            />
            {type === 'MATERIAL' && (
              <>
                <BaseInput 
                  label="카테고리" 
                  value={formData.category || ''} 
                  onChange={e => handleChange('category', e.target.value)} 
                  placeholder="예: 철판"
                />
                <BaseInput 
                  label="비중" 
                  type="number"
                  step="0.01"
                  value={formData.density || ''} 
                  onChange={e => handleChange('density', parseFloat(e.target.value))} 
                />
              </>
            )}
            <CurrencyInput 
              label={type === 'MATERIAL' ? "kg당 단가 (원)" : "기본 단가 (원)"}
              value={formData.unit_price || formData.price_per_kg || ''} 
              onChange={val => {
                handleChange('unit_price', Number(val));
                handleChange('price_per_kg', Number(val));
              }} 
            />
          </div>

          <div className="pt-4 border-t border-border-default pb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">거래처별 단가 정보</h3>
              {!isReadOnly && (
                <Button variant="secondary" size="sm" onClick={() => setSuppliers(prev => [...prev, { unit_price: null, moq: null, memo: '' }])} type="button">
                  <Plus className="w-4 h-4 mr-1.5" />
                  거래처 추가
                </Button>
              )}
            </div>
            
            {suppliers.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-secondary border border-dashed border-border-default rounded-lg bg-bg-surface/50">
                등록된 거래처가 없습니다.
              </div>
            ) : (
              <div className="border border-border-default rounded-lg overflow-visible bg-bg-surface">
                <table className="w-full text-sm text-left">
                  <thead className="bg-bg-overlay/50 border-b border-border-default">
                    <tr>
                      <th className="px-3 py-2.5 font-medium text-text-secondary">거래처</th>
                      <th className="px-3 py-2.5 font-medium text-text-secondary w-32">단가 (원)</th>
                      <th className="px-3 py-2.5 font-medium text-text-secondary w-28">MOQ</th>
                      {!isReadOnly && <th className="px-2 py-2.5 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier, index) => (
                      <React.Fragment key={index}>
                        <tr className="hover:bg-bg-elevated/10 transition-colors">
                        <td className="p-2 relative">
                          <BaseCombobox
                            options={clientOptions}
                            value={supplier.client_id || ''}
                            onChange={val => {
                              const newSuppliers = [...suppliers];
                              newSuppliers[index] = { ...newSuppliers[index], client_id: val };
                              setSuppliers(newSuppliers);
                            }}
                            placeholder="거래처 검색..."
                            inputClassName="px-2.5 py-1.5 rounded-md"
                          />
                        </td>
                        <td className="p-2">
                          <CurrencyInput 
                            inputClassName="!px-2.5 !py-1.5 !rounded-md text-right text-sm"
                            placeholder="0"
                            value={supplier.unit_price || ''}
                            onChange={val => {
                              const newSuppliers = [...suppliers];
                              newSuppliers[index] = { ...newSuppliers[index], unit_price: Number(val) };
                              setSuppliers(newSuppliers);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <CurrencyInput 
                            inputClassName="!px-2.5 !py-1.5 !rounded-md text-right text-sm"
                            placeholder="0"
                            value={supplier.moq || ''}
                            onChange={val => {
                              const newSuppliers = [...suppliers];
                              newSuppliers[index] = { ...newSuppliers[index], moq: Number(val) };
                              setSuppliers(newSuppliers);
                            }}
                          />
                        </td>
                        {!isReadOnly && (
                          <td className="p-2 text-center align-middle">
                            <button 
                              type="button" 
                              className="text-text-muted hover:text-danger p-1.5 rounded-md hover:bg-danger/10 transition-colors"
                              onClick={() => setSuppliers(prev => prev.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                        </tr>
                        <tr className="border-b border-border-default/50 last:border-0 hover:bg-bg-elevated/10 transition-colors">
                          <td colSpan={isReadOnly ? 3 : 4} className="px-2 pb-3 pt-1">
                            <textarea
                              className="w-full min-h-[60px] px-3 py-2 bg-bg-surface border border-border-default rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-y transition-all placeholder:text-text-muted shadow-sm"
                              placeholder="비고 (특이사항, 리드타임 등 입력)..."
                              value={supplier.memo || ''}
                              onChange={e => {
                                const newSuppliers = [...suppliers];
                                newSuppliers[index] = { ...newSuppliers[index], memo: e.target.value };
                                setSuppliers(newSuppliers);
                              }}
                            />
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </fieldset>

        <div className="flex justify-end gap-3 p-6 border-t border-border-default bg-bg-surface rounded-b-xl mt-auto shrink-0">
          <Button variant="ghost" onClick={onClose}>{isReadOnly ? '닫기' : '취소'}</Button>
          {!isReadOnly && <Button variant="primary" onClick={handleSave}>저장</Button>}
        </div>
      </div>
    </div>
  );
};
