import React from 'react';
import { Card } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { BaseInput } from '@/design-system/BaseInput';
import { BizNoInput } from '@/design-system/BizNoInput';
import { PhoneInput } from '@/design-system/PhoneInput';
import { NumberInput } from '@/design-system/NumberInput';
import type { CompanySettings } from '../services/settingsService';
import { Building2, FolderOpen, RefreshCw, Sparkles, CheckCircle2, Download, AlertCircle, ShieldCheck, Calendar, Users, Mail } from 'lucide-react';
import { useAutoUpdater } from '@/shared/hooks/useAutoUpdater';
import { useLicense } from '@/shared/hooks/useLicense';
import { toast } from '@/shared/stores/useToastStore';

interface BasicInfoTabProps {
  form: Partial<CompanySettings>;
  updateForm: (key: keyof CompanySettings, value: any) => void;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({ form, updateForm }) => {
  const { isElectron, currentVersion, updateInfo, checkForUpdates, restartAndInstall } = useAutoUpdater();
  const { license, currentUsersCount } = useLicense();
  const handleSelectRootPath = async () => {
    // @ts-ignore - window.fileSystem is exposed by Electron preload
    if (window.fileSystem && window.fileSystem.selectDirectory) {
      // @ts-ignore
      const path = await window.fileSystem.selectDirectory(form.root_path);
      if (path) updateForm('root_path', path);
    } else {
      toast.error('Electron 환경에서만 경로 선택이 가능합니다.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-default">
          <div className="p-2 bg-brand-500/10 rounded-xl">
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

      {/* 라이선스 및 서비스 이용 현황 카드 */}
      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h3 className="font-black text-text-primary uppercase tracking-tight">라이선스 및 구독 플랜 현황</h3>
              <p className="text-xs text-text-muted mt-0.5">현재 회사의 MiniPDM 소프트웨어 정식 라이선스 계약 및 계정 이용 현황입니다.</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
            license.plan === 'PRO'
              ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
              : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
          }`}>
            MiniPDM {license.plan} Plan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* 상태 */}
          <div className="p-4 rounded-xl bg-bg-elevated border border-border-default">
            <div className="text-[11px] text-text-secondary font-semibold mb-1">라이선스 상태</div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                license.isBlocked 
                  ? 'bg-red-400' 
                  : license.isExpiringSoon || license.isGracePeriod 
                  ? 'bg-amber-400' 
                  : 'bg-emerald-400'
              }`} />
              <span className="font-bold text-sm text-text-primary">
                {license.isBlocked
                  ? '이용 정지 / 만료됨'
                  : license.isGracePeriod
                  ? '결제 유예 기간 중'
                  : license.isTrial
                  ? `무료 체험판 (${license.daysRemaining}일 남음)`
                  : '정상 이용 중'}
              </span>
            </div>
          </div>

          {/* 만료 예정일 */}
          <div className="p-4 rounded-xl bg-bg-elevated border border-border-default">
            <div className="text-[11px] text-text-secondary font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-400" />
              만료 예정일
            </div>
            <div className="font-bold text-sm text-text-primary">
              {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString('ko-KR') : '무제한'}
            </div>
            {license.expiresAt && (
              <div className={`text-[10px] mt-0.5 font-semibold ${
                license.daysRemaining <= 7 ? 'text-amber-400' : 'text-text-secondary'
              }`}>
                {license.daysRemaining <= 0 ? '기한 만료' : `(잔여 ${license.daysRemaining}일)`}
              </div>
            )}
          </div>

          {/* 계정 이용 현황 */}
          <div className="p-4 rounded-xl bg-bg-elevated border border-border-default">
            <div className="text-[11px] text-text-secondary font-semibold mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-brand-400" />
              사용자 계정 (Seat)
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm text-text-primary">
                {currentUsersCount} / {license.maxUsers}명
              </span>
              <span className="text-[10px] text-text-secondary">
                ({Math.max(0, license.maxUsers - currentUsersCount)}명 추가 가능)
              </span>
            </div>
            {currentUsersCount >= license.maxUsers && !license.isMasterVendor && (
              <div className="text-[10px] text-amber-400 font-bold mt-0.5">
                최대 인원 한도에 도달했습니다.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated/40 border border-border-default text-xs text-text-secondary">
          <span>계약 기간 연장, 계정 인원 추가 및 플랜 업그레이드는 공식 공급사(KEP)로 문의해 주세요.</span>
          <a
            href="mailto:support@kendp.com?subject=[MiniPDM 라이선스 연장 및 계정 추가 문의]&body=업체명: "
            className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 ml-3"
          >
            <Mail className="w-3.5 h-3.5" />
            KEP에 문의하기
          </a>
        </div>
      </Card>

      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h3 className="font-black text-text-primary uppercase tracking-tight">소프트웨어 버전 및 자동 업데이트</h3>
              <p className="text-xs text-text-muted mt-0.5">최신 기능과 보안 패치를 자동으로 확인하고 안전하게 갱신합니다.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
            v{currentVersion}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-bg-elevated border border-border-default">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {updateInfo.status === 'checking' && (
                <>
                  <RefreshCw className="w-4 h-4 text-brand-400 animate-spin" />
                  <span className="text-sm font-bold text-text-primary">업데이트 확인 중...</span>
                </>
              )}
              {updateInfo.status === 'downloading' && (
                <>
                  <Download className="w-4 h-4 text-brand-400 animate-bounce" />
                  <span className="text-sm font-bold text-text-primary">최신 업데이트 다운로드 중 ({updateInfo.percent ?? 0}%)</span>
                </>
              )}
              {updateInfo.status === 'downloaded' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">새 버전 준비 완료 (재시작 시 적용)</span>
                </>
              )}
              {updateInfo.status === 'not-available' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-text-primary">현재 최신 버전을 사용하고 있습니다.</span>
                </>
              )}
              {updateInfo.status === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">업데이트 확인 실패</span>
                </>
              )}
              {updateInfo.status === 'idle' && (
                <>
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span className="text-sm font-bold text-text-primary">
                    {isElectron ? '버전 동기화 준비됨' : '웹 브라우저 환경 (데스크톱 전용 기능)'}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-text-muted">
              {updateInfo.message || (isElectron 
                ? '새로운 기능 및 버그 수정 패치가 있는지 확인합니다.' 
                : '자동 업데이트는 Electron 데스크톱 애플리케이션 환경에서 동작합니다.')}
            </p>

            {/* 다운로드 진행률 바 */}
            {updateInfo.status === 'downloading' && typeof updateInfo.percent === 'number' && (
              <div className="w-full bg-bg-surface rounded-full h-2 mt-3 overflow-hidden border border-border-default">
                <div 
                  className="bg-brand-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${updateInfo.percent}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {updateInfo.status === 'downloaded' ? (
              <Button
                variant="primary"
                onClick={restartAndInstall}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                지금 재시작하여 적용
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={checkForUpdates}
                disabled={updateInfo.status === 'checking' || updateInfo.status === 'downloading'}
                className="font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 border border-border-default hover:border-border-strong"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${updateInfo.status === 'checking' ? 'animate-spin' : ''}`} />
                {updateInfo.status === 'checking' ? '확인 중...' : '업데이트 확인'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

