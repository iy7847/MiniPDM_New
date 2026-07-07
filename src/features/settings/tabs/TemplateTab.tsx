import React, { useState } from 'react';
import { Card } from '@/design-system/Card';
import { BaseInput } from '@/design-system/BaseInput';
import type { CompanySettings, CustomTemplate } from '../services/settingsService';
import { FileText, Lightbulb, Plus, Edit, Copy, Trash2, Eye } from 'lucide-react';
import { TemplateBuilderModal } from '../components/builder/TemplateBuilderModal';
import { useSettingsStore } from '@/shared/stores/useSettingsStore';

interface TemplateTabProps {
  form: Partial<CompanySettings>;
  updateForm: (key: keyof CompanySettings, value: any) => void;
}

export const TemplateTab: React.FC<TemplateTabProps> = ({ form, updateForm }) => {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | undefined>(undefined);
  const { customTemplates, addCustomTemplate, deleteCustomTemplate } = useSettingsStore();

  const handleOpenBuilder = (template?: CustomTemplate) => {
    setEditingTemplate(template);
    setIsBuilderOpen(true);
  };

  const handleDuplicateTemplate = async (template: CustomTemplate) => {
    if (!form.id) return;
    await addCustomTemplate(form.id, {
      name: `${template.name} (복사본)`,
      layout_json: template.layout_json,
      is_default: false
    });
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('정말로 이 양식을 삭제하시겠습니까?')) {
      await deleteCustomTemplate(id);
      if (form.quotation_template_type === `custom_${id}`) {
        updateForm('quotation_template_type', 'standard');
      }
    }
  };

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
            { type: 'standard', name: 'Standard (추천)', color: 'bg-brand-500' }
          ].map((tpl) => {
            const isSelected = form.quotation_template_type === tpl.type || ['A', 'B', 'C'].includes(form.quotation_template_type) || !form.quotation_template_type;
            
            return (
              <div
                key={tpl.type}
                onClick={() => updateForm('quotation_template_type', 'standard')}
                className={`group cursor-pointer relative border-2 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300 ${
                  isSelected
                    ? 'border-brand-500 bg-brand-bg shadow-soft scale-[1.02]'
                    : 'border-border-default bg-bg-elevated hover:bg-bg-overlay'
                }`}
              >
                <div className={`w-28 h-36 rounded-lg shadow-smooth border border-border-default overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 ${isSelected ? 'bg-bg-surface' : 'bg-bg-elevated'}`}>
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
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenBuilder(); }} className="p-1.5 bg-white text-gray-800 rounded hover:bg-brand-500 hover:text-white transition-colors" title="미리보기 (또는 이 양식으로 새 양식 만들기)">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-brand-500' : 'text-text-muted'}`}>Built-in</span>
                  <h4 className={`text-base font-black tracking-tight mt-1 ${isSelected ? 'text-brand-400' : 'text-text-secondary'}`}>{tpl.name}</h4>
                </div>
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-glow z-10">✓</div>
                )}
              </div>
            );
          })}

          {customTemplates.map((tpl) => {
            const isSelected = form.quotation_template_type === `custom_${tpl.id}`;
            return (
              <div
                key={tpl.id}
                onClick={() => updateForm('quotation_template_type', `custom_${tpl.id}`)}
                className={`group cursor-pointer relative border-2 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300 ${
                  isSelected
                    ? 'border-brand-500 bg-brand-bg shadow-soft scale-[1.02]'
                    : 'border-border-default bg-bg-elevated hover:bg-bg-overlay'
                }`}
              >
                <div className={`w-28 h-36 rounded-lg shadow-smooth border border-border-default overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 ${isSelected ? 'bg-bg-surface' : 'bg-bg-elevated'} relative`}>
                  <div className={`h-2 bg-text-primary`}></div>
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
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenBuilder(tpl); }} className="p-1.5 bg-white text-gray-800 rounded hover:bg-brand-500 hover:text-white transition-colors" title="수정">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDuplicateTemplate(tpl); }} className="p-1.5 bg-white text-gray-800 rounded hover:bg-brand-500 hover:text-white transition-colors" title="복사">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }} className="p-1.5 bg-white text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors" title="삭제">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-center w-full px-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-brand-500' : 'text-text-muted'}`}>Custom</span>
                  <h4 className={`text-sm font-black tracking-tight mt-1 truncate ${isSelected ? 'text-brand-400' : 'text-text-secondary'}`} title={tpl.name}>{tpl.name}</h4>
                </div>
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-glow z-10">✓</div>
                )}
              </div>
            );
          })}

          {/* Custom Template Add Button (UI Shell) */}
          <div
            className="group cursor-pointer relative border-2 border-dashed border-border-strong rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 bg-bg-elevated hover:bg-bg-overlay hover:border-brand-500"
            onClick={() => handleOpenBuilder()}
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

      {isBuilderOpen && (
        <TemplateBuilderModal
          onClose={() => setIsBuilderOpen(false)}
          onSave={async (name, layout) => {
            if (!form.id) return;
            if (editingTemplate) {
              await useSettingsStore.getState().updateCustomTemplate(editingTemplate.id, { name, layout_json: layout });
            } else {
              await useSettingsStore.getState().addCustomTemplate(form.id, { name, layout_json: layout, is_default: false });
            }
            setIsBuilderOpen(false);
          }}
          form={form}
          initialTemplate={editingTemplate}
        />
      )}
    </div>
  );
};
