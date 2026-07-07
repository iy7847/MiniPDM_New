import React from 'react';
import { Card } from '@/design-system/Card';
import { BaseInput } from '@/design-system/BaseInput';
import type { CompanySettings } from '../services/settingsService';
import { FileText, Lightbulb, Plus } from 'lucide-react';

interface TemplateTabProps {
  form: Partial<CompanySettings>;
  updateForm: (key: keyof CompanySettings, value: any) => void;
}

export const TemplateTab: React.FC<TemplateTabProps> = ({ form, updateForm }) => {
  const handleSelectImage = async (field: 'logo_path' | 'seal_path') => {
    // @ts-ignore
    if (window.fileSystem && window.fileSystem.selectImage) {
      // @ts-ignore
      const path = await window.fileSystem.selectImage();
      if (path) updateForm(field, path);
    } else {
      alert('Electron 환경에서만 파일 선택이 가능합니다.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-default">
          <div className="p-2 bg-brand-bg rounded-xl">
            <FileText className="w-5 h-5 text-brand-500" />
          </div>
          <h3 className="font-black text-text-primary uppercase tracking-tight">견적서 양식 및 자산 (Assets)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { type: 'A', name: 'Modern Full', color: 'bg-brand-500' },
            { type: 'B', name: 'Classic Simple', color: 'bg-text-primary' },
            { type: 'C', name: 'Detailed Table', color: 'bg-success' }
          ].map((tpl) => (
            <div
              key={tpl.type}
              onClick={() => updateForm('quotation_template_type', tpl.type)}
              className={`group cursor-pointer relative border-2 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300 ${
                form.quotation_template_type === tpl.type
                  ? 'border-brand-500 bg-brand-bg shadow-soft scale-[1.02]'
                  : 'border-border-default bg-bg-elevated hover:bg-bg-overlay'
              }`}
            >
              <div className={`w-28 h-36 rounded-lg shadow-smooth border border-border-default overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 ${form.quotation_template_type === tpl.type ? 'bg-bg-surface' : 'bg-bg-elevated'}`}>
                <div className={`h-2 ${tpl.color}`}></div>
                <div className="p-3 space-y-2">
                  <div className="h-1.5 w-full bg-border-strong rounded"></div>
                  <div className="h-1.5 w-2/3 bg-border-strong rounded"></div>
                  <div className="pt-2 grid grid-cols-4 gap-1">
                    <div className="h-1 bg-border-default rounded"></div>
                    <div className="h-1 bg-border-default rounded"></div>
                    <div className="h-1 bg-border-default rounded"></div>
                    <div className="h-1 bg-border-default rounded"></div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <span className={`text-[10px] font-black uppercase tracking-widest ${form.quotation_template_type === tpl.type ? 'text-brand-500' : 'text-text-muted'}`}>Built-in</span>
                <h4 className={`text-base font-black tracking-tight mt-1 ${form.quotation_template_type === tpl.type ? 'text-brand-400' : 'text-text-secondary'}`}>{tpl.name}</h4>
              </div>
              {form.quotation_template_type === tpl.type && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-glow">✓</div>
              )}
            </div>
          ))}

          {/* Custom Template Add Button (UI Shell) */}
          <div
            className="group cursor-pointer relative border-2 border-dashed border-border-strong rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 bg-bg-elevated hover:bg-bg-overlay hover:border-brand-500"
            onClick={() => alert('커스텀 템플릿 생성 기능은 준비 중입니다.')}
          >
            <div className="w-16 h-16 rounded-full bg-bg-surface border border-border-default flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-500 transition-colors shadow-soft">
              <Plus className="w-8 h-8 text-text-muted group-hover:text-white" />
            </div>
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Custom</span>
              <h4 className="text-base font-black tracking-tight mt-1 text-text-primary">새 양식 만들기</h4>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border-default">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 mb-1.5">회사 로고 (Company Logo)</label>
            <div className="flex gap-2">
              <BaseInput className="flex-1 font-mono text-[11px] truncate" value={form.logo_path || ''} readOnly placeholder="이미지 파일 경로..." />
              <button onClick={() => handleSelectImage('logo_path')} className="px-4 py-2 bg-bg-overlay text-text-primary rounded-xl text-[11px] font-black hover:bg-border-strong transition-all border border-border-default">찾기</button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 mb-1.5">법인 직인 (Seal/Stamp)</label>
            <div className="flex gap-2">
              <BaseInput className="flex-1 font-mono text-[11px] truncate" value={form.seal_path || ''} readOnly placeholder="이미지 파일 경로..." />
              <button onClick={() => handleSelectImage('seal_path')} className="px-4 py-2 bg-bg-overlay text-text-primary rounded-xl text-[11px] font-black hover:bg-border-strong transition-all border border-border-default">찾기</button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-default">
          <div className="p-2 bg-warning-bg rounded-xl">
            <Lightbulb className="w-5 h-5 text-warning" />
          </div>
          <h3 className="font-black text-text-primary uppercase tracking-tight">발행 조건 기본 문구 (Default Terms)</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">기본 결제 조건</label>
              <BaseInput value={form.default_payment_terms || ''} onChange={(e) => updateForm('default_payment_terms', e.target.value)} placeholder="예: 인도 후 30일 이내 송금" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">기본 인도 조건</label>
              <BaseInput value={form.default_incoterms || ''} onChange={(e) => updateForm('default_incoterms', e.target.value)} placeholder="예: EXW, FOB" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">기본 납기</label>
              <BaseInput value={form.default_delivery_period || ''} onChange={(e) => updateForm('default_delivery_period', e.target.value)} placeholder="예: 발주 후 2주 이내" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">기본 인도 장소</label>
              <BaseInput value={form.default_destination || ''} onChange={(e) => updateForm('default_destination', e.target.value)} placeholder="예: 귀사 지정 장소" />
            </div>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">기본 비고 사항 (Notes)</label>
            <textarea
              className="flex-1 w-full border border-border-default p-4 rounded-2xl text-sm font-bold bg-bg-elevated text-text-primary focus:border-brand-500 transition-all outline-none resize-none min-h-[150px]"
              value={form.default_note || ''}
              onChange={(e) => updateForm('default_note', e.target.value)}
              placeholder="모든 견적서에 공통으로 표시될 안내 문구입니다."
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
