import React from 'react';
import { Card } from '@/design-system/Card';
import { BaseInput } from '@/design-system/BaseInput';
import { BizNoInput } from '@/design-system/BizNoInput';
import { PhoneInput } from '@/design-system/PhoneInput';
import { NumberInput } from '@/design-system/NumberInput';
import type { CompanySettings } from '../services/settingsService';
import { Building2, FolderOpen } from 'lucide-react';

interface BasicInfoTabProps {
  form: Partial<CompanySettings>;
  updateForm: (key: keyof CompanySettings, value: any) => void;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({ form, updateForm }) => {
  const handleSelectRootPath = async () => {
    // @ts-ignore - window.fileSystem is exposed by Electron preload
    if (window.fileSystem && window.fileSystem.selectDirectory) {
      // @ts-ignore
      const path = await window.fileSystem.selectDirectory(form.root_path);
      if (path) updateForm('root_path', path);
    } else {
      alert('Electron 환경에서만 경로 선택이 가능합니다.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-default">
          <div className="p-2 bg-brand-bg rounded-xl">
            <Building2 className="w-5 h-5 text-brand-500" />
          </div>
          <h3 className="font-black text-text-primary uppercase tracking-tight">회사 프로필</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">상호명 (Company Name)</label>
            <BaseInput value={form.name || ''} disabled className="bg-bg-elevated text-text-secondary cursor-not-allowed opacity-70" />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">사업자등록번호</label>
            <BizNoInput value={form.biz_num || ''} onChange={(val) => updateForm('biz_num', val)} />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">대표자명</label>
            <BaseInput value={form.ceo_name || ''} onChange={(e) => updateForm('ceo_name', e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">주소 (Address)</label>
            <BaseInput value={form.address || ''} onChange={(e) => updateForm('address', e.target.value)} placeholder="견적서에 표시될 주소를 입력하세요" />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">전화번호 (Tel)</label>
            <PhoneInput value={form.phone || ''} onChange={(val) => updateForm('phone', val)} />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">팩스 (Fax)</label>
            <PhoneInput value={form.fax || ''} onChange={(val) => updateForm('fax', val)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">이메일 (Email)</label>
            <BaseInput value={form.email || ''} onChange={(e) => updateForm('email', e.target.value)} type="email" />
          </div>
        </div>
      </Card>

      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-default">
          <div className="p-2 bg-info-bg rounded-xl">
            <FolderOpen className="w-5 h-5 text-info" />
          </div>
          <h3 className="font-black text-text-primary uppercase tracking-tight">파일 저장 경로 및 라벨 설정</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
              파일 저장소 루트 경로
            </label>
            <div className="flex gap-2">
              <BaseInput
                className="flex-1 font-mono text-xs"
                value={form.root_path || ''}
                onChange={(e) => updateForm('root_path', e.target.value)}
              />
              <button
                onClick={handleSelectRootPath}
                className="bg-bg-overlay text-text-primary px-4 py-2 rounded-xl text-xs font-black hover:bg-border-strong transition-all shadow-sm whitespace-nowrap border border-border-default"
              >
                경로 선택
              </button>
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 flex items-center gap-1">
              라벨 프린터 규격 (mm)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-text-muted uppercase ml-1">Width</label>
                <NumberInput
                  value={form.label_printer_width}
                  onChange={(val) => updateForm('label_printer_width', val)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-text-muted uppercase ml-1">Height</label>
                <NumberInput
                  value={form.label_printer_height}
                  onChange={(val) => updateForm('label_printer_height', val)}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
