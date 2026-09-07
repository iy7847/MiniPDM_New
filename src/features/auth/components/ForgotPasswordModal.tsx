import React, { useState } from 'react';
import { supabase } from '@/shared/services/supabase';
import { Button, BaseInput } from '@/design-system';
import { X, CheckCircle2, AlertCircle, KeyRound, Info } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({ isOpen, onClose, defaultEmail = '' }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  // defaultEmail 변경 시 동기화
  React.useEffect(() => {
    if (defaultEmail) {
      setEmail(defaultEmail);
    }
  }, [defaultEmail]);

  if (!isOpen) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('이메일 주소를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Supabase 비밀번호 재설정 이메일 발송
      const redirectUrl = `${window.location.origin}/#/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (resetError) throw resetError;

      setIsSent(true);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('rate limit')) {
        setError('요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError(msg || '비밀번호 재설정 요청 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setIsSent(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#30363D]">
          <h3 className="text-lg font-bold text-[#E6EDF3] flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-brand-500" />
            비밀번호 찾기
          </h3>
          <button
            onClick={handleClose}
            className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSent ? (
            <div className="space-y-6 text-center animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h4 className="text-lg font-bold text-[#E6EDF3] mb-2">재설정 링크가 발송되었습니다</h4>
                <p className="text-sm text-[#8B949E] leading-relaxed">
                  <span className="text-brand-400 font-medium font-mono">{email}</span> 으로<br />
                  비밀번호 재설정 안내 메일을 전송하였습니다.<br />
                  수신된 메일의 링크를 클릭하여 새 비밀번호를 설정해주세요.
                </p>
              </div>

              <div className="bg-bg-base/60 border border-border-default rounded-xl p-4 text-xs text-[#8B949E] text-left space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                  <Info className="w-3.5 h-3.5 text-brand-400" />
                  메일이 도착하지 않았나요?
                </div>
                <p>• 스팸 메일함 또는 정크 메일함을 확인해주세요.</p>
                <p>• 사내 폐쇄망 환경이거나 메일 수신이 어려운 경우, <strong>사내 관리자</strong>에게 비밀번호 초기화를 요청해주세요.</p>
              </div>

              <Button variant="primary" className="w-full h-11" onClick={handleClose}>
                확인 및 로그인으로 돌아가기
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <p className="text-sm text-[#8B949E] leading-relaxed">
                가입 시 등록하셨던 이메일 주소를 입력하시면 비밀번호를 재설정할 수 있는 인증 링크를 보내드립니다.
              </p>

              {error && (
                <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#8B949E]">가입 이메일 주소</label>
                <BaseInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                />
              </div>

              <div className="bg-bg-base/50 border border-border-default rounded-xl p-4 text-xs text-[#8B949E] space-y-1">
                <p className="flex items-center gap-1 text-text-secondary font-medium">
                  <Info className="w-3.5 h-3.5 text-brand-400" />
                  사내 보안 안내
                </p>
                <p>외부 메일 연동이 제한된 사내 환경의 경우, 최고 관리자에게 문의하시면 계정 정보를 즉시 확인받으실 수 있습니다.</p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={handleClose}>
                  취소
                </Button>
                <Button type="submit" variant="primary" className="flex-1 h-11" disabled={loading}>
                  {loading ? '발송 중...' : '재설정 링크 받기'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
