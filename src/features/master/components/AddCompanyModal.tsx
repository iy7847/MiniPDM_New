import React, { useState } from 'react';
import { X, Building2, Calendar, Users, ShieldCheck } from 'lucide-react';
import { Button, BaseInput } from '@/design-system';
import { masterService } from '../services/masterService';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [bizNum, setBizNum] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [trialDays, setTrialDays] = useState(30);
  const [maxUsers, setMaxUsers] = useState(5);
  const [licensePlan, setLicensePlan] = useState<'PRO' | 'STANDARD'>('PRO');
  const [billingMemo, setBillingMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('업체명을 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await masterService.createCompanyWithLicense({
        name: name.trim(),
        biz_num: bizNum.trim() || undefined,
        ceo_name: ceoName.trim() || undefined,
        trial_days: Number(trialDays) || 30,
        max_users: Number(maxUsers) || 5,
        license_plan: licensePlan,
        billing_memo: billingMemo.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('신규 업체 등록 실패:', err);
      setError(err.message || '업체 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-bg-surface border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-elevated/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">신규 고객사(업체) 등록</h3>
              <p className="text-xs text-text-secondary">새로운 고객사를 등록하고 라이선스 및 체험 기간을 발급합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <BaseInput
              label="업체명 (필수)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 삼우정밀, 대성테크"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <BaseInput
                label="대표자명"
                value={ceoName}
                onChange={(e) => setCeoName(e.target.value)}
                placeholder="예: 홍길동"
              />
              <BaseInput
                label="사업자등록번호"
                value={bizNum}
                onChange={(e) => setBizNum(e.target.value)}
                placeholder="000-00-00000"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border-default space-y-3">
            {/* 라이선스 플랜 */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                라이선스 플랜
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLicensePlan('PRO')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    licensePlan === 'PRO'
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                      : 'bg-bg-elevated/40 border-border-default text-text-secondary hover:border-border-strong'
                  }`}
                >
                  <div className="font-bold text-xs">MiniPDM PRO (추천)</div>
                  <div className="text-[11px] opacity-75 mt-0.5">현장 MES 스캐너, 공정 라우팅 포함</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLicensePlan('STANDARD')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    licensePlan === 'STANDARD'
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                      : 'bg-bg-elevated/40 border-border-default text-text-secondary hover:border-border-strong'
                  }`}
                >
                  <div className="font-bold text-xs">MiniPDM STANDARD</div>
                  <div className="text-[11px] opacity-75 mt-0.5">견적, 수주, 출하 기본 기능</div>
                </button>
              </div>
            </div>

            {/* 체험판 기간 설정 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-400" />
                  최초 체험판 기간 (기본 30일)
                </label>
                <div className="flex items-center gap-1">
                  {[14, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTrialDays(d)}
                      className={`px-2 py-0.5 text-[11px] rounded-md transition-colors ${
                        trialDays === d
                          ? 'bg-brand-500 text-white font-bold'
                          : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {d}일
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BaseInput
                  type="number"
                  min="1"
                  max="365"
                  value={trialDays.toString()}
                  onChange={(e) => setTrialDays(parseInt(e.target.value) || 30)}
                />
                <span className="text-xs text-text-secondary whitespace-nowrap">일간 무료 체험 제공</span>
              </div>
            </div>

            {/* 기본 허용 계정 수 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-400" />
                  기본 허용 사용자 수 (기본 5명)
                </label>
                <div className="flex items-center gap-1">
                  {[3, 5, 10, 20].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setMaxUsers(u)}
                      className={`px-2 py-0.5 text-[11px] rounded-md transition-colors ${
                        maxUsers === u
                          ? 'bg-brand-500 text-white font-bold'
                          : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {u}명
                    </button>
                  ))}
                </div>
              </div>
              <BaseInput
                type="number"
                min="1"
                max="500"
                value={maxUsers.toString()}
                onChange={(e) => setMaxUsers(parseInt(e.target.value) || 5)}
              />
            </div>

            {/* 계약 메모 */}
            <BaseInput
              label="계약 / 입금 메모"
              value={billingMemo}
              onChange={(e) => setBillingMemo(e.target.value)}
              placeholder="예: 2026-09 신규 유선 도입 문의, 무료 30일 후 전환 협의"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-default">
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              취소
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? '등록 중...' : '업체 등록 및 라이선스 발급'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
