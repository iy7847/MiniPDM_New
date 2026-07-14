import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/design-system/Button';
import { BaseInput } from '@/design-system/BaseInput';
import { PhoneInput } from '@/design-system/PhoneInput';
import { BizNoInput } from '@/design-system/BizNoInput';
import type { Client, ClientFormData, ClientType } from '@/shared/types/client';

const COUNTRY_GROUPS = {
  '주요 국가 (Major)': [
    { code: 'US', name: '미국 (United States)' },
    { code: 'CN', name: '중국 (China)' },
    { code: 'JP', name: '일본 (Japan)' },
    { code: 'GB', name: '영국 (United Kingdom)' },
    { code: 'VN', name: '베트남 (Vietnam)' },
    { code: 'DE', name: '독일 (Germany)' },
  ],
  '아시아 (Asia)': [
    { code: 'TW', name: '대만 (Taiwan)' },
    { code: 'IN', name: '인도 (India)' },
    { code: 'ID', name: '인도네시아 (Indonesia)' },
    { code: 'TH', name: '태국 (Thailand)' },
    { code: 'SG', name: '싱가포르 (Singapore)' },
    { code: 'PH', name: '필리핀 (Philippines)' },
    { code: 'HK', name: '홍콩 (Hong Kong)' },
  ],
  '유럽 (Europe)': [
    { code: 'FR', name: '프랑스 (France)' },
    { code: 'IT', name: '이탈리아 (Italy)' },
    { code: 'ES', name: '스페인 (Spain)' },
    { code: 'NL', name: '네덜란드 (Netherlands)' },
    { code: 'PL', name: '폴란드 (Poland)' },
    { code: 'TR', name: '튀르키예 (Turkey)' },
    { code: 'CZ', name: '체코 (Czechia)' },
  ],
  '아메리카 (Americas)': [
    { code: 'CA', name: '캐나다 (Canada)' },
    { code: 'MX', name: '멕시코 (Mexico)' },
    { code: 'BR', name: '브라질 (Brazil)' },
  ],
  '오세아니아/기타': [
    { code: 'AU', name: '호주 (Australia)' },
    { code: 'NZ', name: '뉴질랜드 (New Zealand)' },
    { code: 'RU', name: '러시아 (Russia)' },
    { code: 'ZA', name: '남아공 (South Africa)' },
  ]
};

const INITIAL_FORM: ClientFormData = {
  name: '',
  biz_num: '',
  manager_name: '',
  manager_phone: '',
  manager_email: '',
  is_foreign: false,
  country: 'KR',
  currency: 'KRW',
  client_type: 'CUSTOMER'
};

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: ClientFormData, editId?: string) => Promise<void>;
  editClient?: Client | null;
}

export function ClientModal({ isOpen, onClose, onSave, editClient }: ClientModalProps) {
  const [formData, setFormData] = useState<ClientFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editClient) {
        setFormData({
          name: editClient.name,
          biz_num: editClient.biz_num || '',
          manager_name: editClient.manager_name || '',
          manager_phone: editClient.manager_phone || '',
          manager_email: editClient.manager_email || '',
          is_foreign: editClient.is_foreign ?? false,
          country: editClient.country || 'KR',
          currency: editClient.currency || 'KRW',
          client_type: editClient.client_type || 'CUSTOMER'
        });
      } else {
        setFormData(INITIAL_FORM);
      }
      setError(null);
    }
  }, [isOpen, editClient]);

  if (!isOpen) return null;

  const handleForeignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isForeign = e.target.checked;
    setFormData({
      ...formData,
      is_foreign: isForeign,
      country: isForeign ? 'US' : 'KR',
      biz_num: '',
      currency: isForeign ? 'USD' : 'KRW',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('거래처명은 필수입니다.');
      return;
    }
    
    if (formData.is_foreign && !formData.country) {
      setError('해외 기업인 경우 국가를 선택해주세요.');
      return;
    }

    if (!formData.is_foreign && formData.biz_num) {
      const cleanNum = formData.biz_num.replace(/[^0-9]/g, '');
      if (cleanNum.length !== 10 && cleanNum.length > 0) {
        setError('국내 사업자번호는 10자리 숫자여야 합니다.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(formData, editClient?.id);
      onClose();
    } catch (err: any) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border-default">
          <h3 className="text-xl font-bold text-text-primary">
            {editClient ? '거래처 정보 수정' : '신규 거래처 등록'}
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-danger-bg border border-danger-border rounded-lg text-danger text-sm font-bold animate-in slide-in-from-top-1">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-secondary">구분 <span className="text-danger">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {(['CUSTOMER', 'SUPPLIER', 'BOTH'] as ClientType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, client_type: type })}
                    className={`py-2 rounded-lg text-sm font-bold transition-all border ${
                      formData.client_type === type 
                        ? 'bg-brand-50 border-brand-500 text-brand-600 shadow-sm' 
                        : 'bg-bg-elevated border-border-default text-text-secondary hover:border-brand-500/50'
                    }`}
                  >
                    {type === 'CUSTOMER' ? '매출처' : type === 'SUPPLIER' ? '매입/외주처' : '공통 (매출/매입)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-secondary">거래처명 <span className="text-danger">*</span></label>
              <BaseInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="(주)미래정밀"
                autoFocus
              />
            </div>

            <div className="bg-bg-elevated p-4 rounded-xl border border-border-default space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_foreign"
                    checked={formData.is_foreign}
                    onChange={handleForeignChange}
                    className="w-5 h-5 text-brand-600 rounded border-border-strong focus:ring-brand-500 cursor-pointer bg-bg-base"
                  />
                  <label htmlFor="is_foreign" className="text-sm font-bold text-text-primary select-none cursor-pointer">
                    해외 기업 (Foreign)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-text-secondary">결제 통화</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="border border-border-strong p-1.5 rounded-lg text-sm bg-bg-base font-bold text-brand-500 outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="KRW">KRW (₩)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="CNY">CNY (¥)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="VND">VND (₫)</option>
                  </select>
                </div>
              </div>

              {formData.is_foreign && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-1.5">
                  <label className="block text-xs font-bold text-text-secondary">국가 선택</label>
                  <select
                    className="w-full border border-border-strong p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/30 font-bold text-text-primary bg-bg-base"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  >
                    {Object.entries(COUNTRY_GROUPS).map(([groupName, countries]) => (
                      <optgroup key={groupName} label={groupName}>
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-secondary">
                {formData.is_foreign ? "Tax ID (사업자번호)" : "사업자번호"}
              </label>
              {formData.is_foreign ? (
                <BaseInput
                  value={formData.biz_num}
                  onChange={(e) => setFormData({ ...formData, biz_num: e.target.value })}
                  placeholder="Free Format"
                />
              ) : (
                <BizNoInput
                  value={formData.biz_num}
                  onChange={(val) => setFormData({ ...formData, biz_num: val })}
                  placeholder="000-00-00000"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">담당자명</label>
                <BaseInput
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  placeholder="홍길동"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">연락처</label>
                {formData.is_foreign ? (
                  <BaseInput
                    value={formData.manager_phone}
                    onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                    placeholder="Free Format"
                  />
                ) : (
                  <PhoneInput
                    value={formData.manager_phone}
                    onChange={(val) => setFormData({ ...formData, manager_phone: val })}
                    placeholder="010-0000-0000"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-secondary">이메일</label>
              <BaseInput
                type="email"
                value={formData.manager_email}
                onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                placeholder="manager@partner.com"
              />
            </div>
          </form>
        </div>
        
        <div className="p-4 border-t border-border-default flex gap-3 bg-bg-overlay">
          <Button type="button" variant="outline" className="flex-1 font-bold" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" form="client-form" variant="primary" className="flex-1 font-bold shadow-glow" disabled={loading}>
            {loading ? '저장 중...' : '저장하기'}
          </Button>
        </div>
      </div>
    </div>
  );
}
