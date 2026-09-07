import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, ExternalLink, LogOut, Copy, Check } from 'lucide-react';
import { useLicense } from '@/shared/hooks/useLicense';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/design-system';

export const LicenseBlockedOverlay: React.FC = () => {
  const { license, isMasterAdmin, loading } = useLicense();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (loading || isMasterAdmin || !license.isBlocked) {
    return null;
  }

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@kendp.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    const { supabase } = await import('@/shared/services/supabase');
    await supabase.auth.signOut();
    window.location.href = '#/login';
  };

  const isSuspended = license.status === 'SUSPENDED';
  const isTrialExpired = license.isTrial;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 select-none">
      <div className="w-full max-w-md bg-[#161B22] border border-red-500/40 rounded-3xl shadow-2xl shadow-red-950/40 overflow-hidden text-center p-8 relative flex flex-col items-center">
        
        {/* 네온 레드 잠금 뱃지 */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-5 shadow-lg shadow-red-500/20">
          {isSuspended ? <Lock className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
        </div>

        {/* 타이틀 */}
        <h2 className="text-xl font-black text-text-primary mb-2">
          {isSuspended
            ? '서비스 이용이 일시 정지되었습니다'
            : isTrialExpired
            ? '무료 체험 기간이 만료되었습니다'
            : '라이선스 이용 기한이 만료되었습니다'}
        </h2>

        {/* 상태 설명 */}
        <p className="text-xs text-text-secondary leading-relaxed mb-6">
          {isSuspended
            ? `[${license.companyName}] 계정의 이용이 관리자에 의해 일시 정지되었습니다. 미납금 정산 또는 계약 문의가 필요합니다.`
            : isTrialExpired
            ? `30일간의 무료 체험이 종료되었습니다. 정식 라이선스로 전환하시면 모든 기능과 데이터를 계속해서 영구히 이용하실 수 있습니다.`
            : `[${license.companyName}]의 라이선스 만료일(${license.expiresAt ? new Date(license.expiresAt).toLocaleDateString('ko-KR') : ''}) 및 유예 기간이 경과하여 서비스가 잠금 처리되었습니다.`}
        </p>

        {/* 데이터 안전 보존 안내 카드 */}
        <div className="w-full bg-[#0D1117] border border-border-default rounded-2xl p-4 text-left mb-6 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            고객사 데이터 100% 안전 보관 중
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            등록하신 견적, 수주, 생산 내역 등 모든 데이터는 KEP 클라우드에 영구히 안전하게 보존되어 있으며, <strong>라이선스 연장 즉시 1초 만에 정상 복구</strong>됩니다.
          </p>
        </div>

        {/* KEP 고객지원 연락처 */}
        <div className="w-full space-y-2 mb-6 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated/70 border border-border-default">
            <div className="flex items-center gap-2 text-text-secondary">
              <Mail className="w-4 h-4 text-brand-400" />
              <span>공식 지원: support@kendp.com</span>
            </div>
            <button
              onClick={handleCopyEmail}
              className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="w-full space-y-2">
          <a
            href={`mailto:support@kendp.com?subject=[MiniPDM 라이선스 문의] ${license.companyName}&body=업체명: ${license.companyName}%0D%0A로그인 계정: ${user?.email}%0D%0A문의 내용: 라이선스 연장 및 입금 확인 요청합니다.`}
            className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-400 text-white font-black text-xs rounded-xl shadow-lg shadow-brand-950/40 flex items-center justify-center gap-2 transition-all"
          >
            <Mail className="w-4 h-4" />
            KEP 고객센터에 연장 문의 보내기
          </a>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            다른 계정으로 로그인 / 로그아웃
          </button>
        </div>

        <div className="mt-4 text-[10px] text-text-secondary/70">
          © 2026 KEP (kendp.com). All rights reserved.
        </div>
      </div>
    </div>
  );
};
