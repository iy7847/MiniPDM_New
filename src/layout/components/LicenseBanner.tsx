import React from 'react';
import { AlertTriangle, Clock, ShieldAlert, Mail } from 'lucide-react';
import { useLicense } from '@/shared/hooks/useLicense';

export const LicenseBanner: React.FC = () => {
  const { license, isMasterAdmin, loading } = useLicense();

  if (loading || isMasterAdmin || license.isBlocked) {
    return null;
  }

  // 1. 유료 고객 결제 유예 기간 (만료 후 3일간)
  if (license.isGracePeriod) {
    const remainingGraceDays = Math.max(0, 3 + license.daysRemaining);
    return (
      <div className="bg-red-500/15 border-b border-red-500/30 text-red-300 px-4 py-2 text-xs flex items-center justify-between animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-bold">
            [결제 유예 기간] 라이선스 기한이 만료되었습니다. {remainingGraceDays}일 이내에 연장 결제가 완료되지 않으면 프로그램 이용이 전면 잠금 처리됩니다.
          </span>
        </div>
        <a
          href="mailto:support@kendp.com?subject=[MiniPDM 라이선스 연장 결제 요청]&body=업체명: "
          className="px-2.5 py-1 bg-red-500 text-white rounded-md font-bold text-[11px] hover:bg-red-400 transition-colors flex items-center gap-1 shrink-0 ml-4"
        >
          <Mail className="w-3.5 h-3.5" />
          KEP에 연장 문의
        </a>
      </div>
    );
  }

  // 2. 체험판 만료 임박 (D-7 이내)
  if (license.isTrial && license.isExpiringSoon) {
    return (
      <div className="bg-blue-500/15 border-b border-blue-500/30 text-blue-300 px-4 py-2 text-xs flex items-center justify-between animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong className="font-bold">[무료 체험 만료 {license.daysRemaining}일 전]</strong> {license.daysRemaining}일 후 체험이 종료됩니다. 중단 없이 계속 이용하시려면 정식 라이선스로 전환해 주세요.
          </span>
        </div>
        <a
          href="mailto:support@kendp.com?subject=[MiniPDM 정식 라이선스 도입 문의]&body=업체명: "
          className="px-2.5 py-1 bg-blue-500 text-white rounded-md font-bold text-[11px] hover:bg-blue-400 transition-colors flex items-center gap-1 shrink-0 ml-4"
        >
          <Mail className="w-3.5 h-3.5" />
          정식 전환 문의
        </a>
      </div>
    );
  }

  // 3. 정식 라이선스 만료 임박 (D-7 이내)
  if (!license.isTrial && license.isExpiringSoon) {
    return (
      <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs flex items-center justify-between animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="font-bold">[라이선스 만료 {license.daysRemaining}일 전]</strong> 이용 기간이 곧 만료됩니다. 서비스 중단을 방지하려면 연장 결제를 진행해 주세요.
          </span>
        </div>
        <a
          href="mailto:support@kendp.com?subject=[MiniPDM 라이선스 연장 결제 요청]&body=업체명: "
          className="px-2.5 py-1 bg-amber-500 text-black font-bold rounded-md text-[11px] hover:bg-amber-400 transition-colors flex items-center gap-1 shrink-0 ml-4"
        >
          <Mail className="w-3.5 h-3.5" />
          연장 결제 문의
        </a>
      </div>
    );
  }

  return null;
};
