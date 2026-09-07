import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/design-system/Button';
import { masterService } from '../services/masterService';
import { toast } from '@/shared/stores/useToastStore';
import type { MasterCompanyItem } from '../services/masterService';

interface ChangeExpiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: MasterCompanyItem | null;
  onSuccess: () => void;
}

export const ChangeExpiryModal: React.FC<ChangeExpiryModalProps> = ({
  isOpen,
  onClose,
  company,
  onSuccess,
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [autoActivate, setAutoActivate] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company && isOpen) {
      if (company.expiresAt) {
        // YYYY-MM-DD 포맷으로 변환
        const d = new Date(company.expiresAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
      }
      setAutoActivate(true);
    }
  }, [company, isOpen]);

  if (!isOpen || !company) return null;

  // 빠른 단축 날짜 설정 함수
  const setQuickDays = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // 올해 말일 설정
  const setEndOfThisYear = () => {
    const currentYear = new Date().getFullYear();
    setSelectedDate(`${currentYear}-12-31`);
  };

  // 내년 말일 설정
  const setEndOfNextYear = () => {
    const currentYear = new Date().getFullYear();
    setSelectedDate(`${currentYear + 1}-12-31`);
  };

  // D-Day 계산
  const getDaysDiff = () => {
    if (!selectedDate) return null;
    const target = new Date(selectedDate + 'T23:59:59').getTime();
    const now = Date.now();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysDiff = getDaysDiff();

  const handleSave = async () => {
    if (!selectedDate) {
      toast.error('만료 예정일을 선택해 주세요.');
      return;
    }

    try {
      setSaving(true);
      const isoExpiresAt = new Date(selectedDate + 'T23:59:59').toISOString();
      
      const updates: any = {
        license_expires_at: isoExpiresAt,
      };

      // 미래 날짜이고 자동 활성화 체크된 경우 정상 상태로 변경
      if (autoActivate && daysDiff !== null && daysDiff > 0) {
        updates.license_status = 'ACTIVE';
      }

      await masterService.updateLicense(company.companyId, updates);
      toast.success(`${company.companyName}의 만료 예정일이 ${selectedDate}로 변경되었습니다.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('만료일 변경 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363D] bg-[#21262D]/50">
          <div className="flex items-center gap-2 text-brand-400 font-bold">
            <div className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20">
              <Calendar className="w-5 h-5 text-brand-400" />
            </div>
            <span className="text-text-primary text-base font-bold">만료 예정일 직접 지정</span>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-[#30363D] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 바디 */}
        <div className="p-6 space-y-5">
          {/* 고객사 정보 안내 */}
          <div className="p-3 bg-[#21262D] rounded-xl border border-[#30363D] flex items-center justify-between">
            <div>
              <div className="text-xs text-text-secondary font-medium">대상 고객사</div>
              <div className="text-sm font-black text-white mt-0.5">{company.companyName}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-secondary font-medium">현재 상태</div>
              <div className="text-xs font-bold text-brand-400 mt-0.5">{company.status} ({company.daysRemaining}일 남음)</div>
            </div>
          </div>

          {/* 달력 날짜 입력 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-400" />
              새로운 만료 예정일 선택
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-xl text-text-primary font-semibold text-sm focus:outline-none focus:border-brand-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* 빠른 단축 버튼들 */}
          <div className="space-y-1.5">
            <div className="text-xs text-text-secondary font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 빠른 단축 지정
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setQuickDays(30)}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-[#21262D] hover:bg-brand-500/20 hover:text-brand-300 text-text-secondary border border-[#30363D] transition-all"
              >
                +30일
              </button>
              <button
                type="button"
                onClick={() => setQuickDays(90)}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-[#21262D] hover:bg-brand-500/20 hover:text-brand-300 text-text-secondary border border-[#30363D] transition-all"
              >
                +90일 (3개월)
              </button>
              <button
                type="button"
                onClick={() => setQuickDays(180)}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-[#21262D] hover:bg-brand-500/20 hover:text-brand-300 text-text-secondary border border-[#30363D] transition-all"
              >
                +180일 (6개월)
              </button>
              <button
                type="button"
                onClick={() => setQuickDays(365)}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-[#21262D] hover:bg-brand-500/20 hover:text-brand-300 text-text-secondary border border-[#30363D] transition-all"
              >
                +365일 (1년)
              </button>
              <button
                type="button"
                onClick={setEndOfThisYear}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-[#21262D] hover:bg-brand-500/20 hover:text-brand-300 text-text-secondary border border-[#30363D] transition-all"
              >
                올해 말일 (12/31)
              </button>
              <button
                type="button"
                onClick={setEndOfNextYear}
                className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-[#21262D] hover:bg-brand-500/20 hover:text-brand-300 text-text-secondary border border-[#30363D] transition-all"
              >
                내년 말일 (12/31)
              </button>
            </div>
          </div>

          {/* 적용 결과 미리보기 */}
          {daysDiff !== null && (
            <div className={`p-3 rounded-xl border text-xs font-medium ${
              daysDiff > 0 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {daysDiff > 0 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {daysDiff > 0 
                  ? `지정 시점부터 앞으로 ${daysDiff}일 동안 이용 가능합니다.` 
                  : `지정한 날짜는 이미 지난 날짜입니다 (${Math.abs(daysDiff)}일 경과). 저장 시 만료 처리됩니다.`}
              </div>
            </div>
          )}

          {/* 정식 이용 상태로 자동 활성화 옵션 */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={autoActivate}
              onChange={(e) => setAutoActivate(e.target.checked)}
              className="w-4 h-4 rounded bg-[#0D1117] border-[#30363D] text-brand-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>만료일이 미래인 경우 정식 이용(ACTIVE) 상태로 자동 활성화</span>
          </label>
        </div>

        {/* 푸터 버튼 */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#30363D] bg-[#21262D]/30">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-400 font-bold"
          >
            {saving ? '저장 중...' : '만료일 저장'}
          </Button>
        </div>

      </div>
    </div>
  );
};
