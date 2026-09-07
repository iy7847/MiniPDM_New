import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/services/supabase';
import { Lock, Activity, ArrowRight, CheckCircle2, AlertCircle, ShieldAlert, RotateCcw } from 'lucide-react';
import { toast } from '@/shared/stores/useToastStore';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 세션 및 URL 토큰 사전 검증
  useEffect(() => {
    let isMounted = true;

    const checkAuthSession = async () => {
      try {
        // 1. PKCE code가 searchParams에 있는 경우 처리
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (codeError) console.warn('Exchange code error:', codeError);
        }

        // 2. Hash에 access_token이 포함된 경우 (Implicit / Hash routing 보정)
        // 예: #/reset-password#access_token=... 또는 #access_token=...
        const hash = window.location.hash;
        if (hash.includes('access_token=')) {
          const tokenPart = hash.substring(hash.indexOf('access_token='));
          const hashParams = new URLSearchParams(tokenPart);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) console.warn('Set session error:', sessionError);
          }
        }

        // 3. 현재 세션 서버 검증 (getUser를 호출하여 실제 토큰 유효성 및 만료 여부 확인)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (isMounted) {
          setHasValidSession(!!user && !userError);
        }
      } catch (err) {
        console.error('Session check error:', err);
        if (isMounted) {
          setHasValidSession(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkAuthSession();

    // 4. Auth 상태 변경 리스너 (PASSWORD_RECOVERY 이벤트 감지)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' || session?.user) {
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      toast.success('비밀번호가 성공적으로 변경되었습니다.');
      setTimeout(() => {
        navigate('/login', { state: { message: '새 비밀번호로 로그인해주세요.' } });
      }, 2500);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('same as') || msg.includes('different from')) {
        setError('이전과 동일한 비밀번호로는 변경할 수 없습니다.');
      } else if (msg.includes('Auth session missing') || msg.includes('session missing')) {
        setError('인증 세션이 유효하지 않거나 만료되었습니다. 이메일 링크를 다시 확인해주세요.');
      } else if (msg.includes('should be at least') || msg.includes('Password should be')) {
        setError('비밀번호는 최소 6자리 이상이어야 합니다.');
      } else if (msg.includes('Token has expired') || msg.includes('expired')) {
        setError('인증 링크 유효시간이 만료되었습니다. 비밀번호 찾기를 다시 요청해주세요.');
      } else {
        setError('비밀번호 재설정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0D1117] text-[#E6EDF3] selection:bg-brand-500 selection:text-white">
      {/* Left Column: Brand Intro */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#161B22] border-r border-[#30363D] flex-col justify-between p-12 lg:p-24">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 bg-brand-500/10 text-brand-500 rounded-xl border border-brand-500/20 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              <Activity size={24} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">MiniPDM</h1>
          </div>
          <h2 className="text-4xl font-extrabold leading-tight mb-6 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            비밀번호 재설정
          </h2>
          <p className="text-[#8B949E] text-lg leading-relaxed max-w-md animate-in fade-in slide-in-from-bottom-5 duration-700 delay-150">
            새로운 비밀번호를 입력하여 안전하게 계정을 복구하세요.
          </p>
        </div>

        <div className="relative z-10 border-l-2 border-brand-500 pl-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <p className="text-sm text-[#8B949E]">
            "철저한 접근 제어와 데이터 보호로 신뢰할 수 있는 제조 환경을 만듭니다."
          </p>
        </div>
      </div>

      {/* Right Column: Reset Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-8 sm:p-10 shadow-2xl relative">
            {isCheckingSession ? (
              <div className="text-center py-12 animate-in fade-in space-y-4">
                <div className="w-10 h-10 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto" />
                <p className="text-[#8B949E] text-sm">인증 세션을 확인하고 있습니다...</p>
              </div>
            ) : success ? (
              <div className="text-center py-6 animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">변경 완료!</h3>
                <p className="text-[#8B949E] text-sm leading-relaxed mb-4">
                  비밀번호가 성공적으로 변경되었습니다.<br />
                  잠시 후 로그인 페이지로 자동 이동합니다...
                </p>
              </div>
            ) : !hasValidSession ? (
              <div className="space-y-6 text-center animate-in fade-in">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <ShieldAlert size={30} />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2">인증 세션이 유효하지 않습니다</h3>
                  <p className="text-sm text-[#8B949E] leading-relaxed">
                    비밀번호 재설정은 이메일로 수신된<br />
                    <strong className="text-brand-400 font-semibold">'비밀번호 재설정 인증 링크'</strong>를 통해서만 접속 가능합니다.
                  </p>
                </div>

                <div className="bg-[#0D1117]/80 border border-[#30363D] rounded-xl p-4 text-xs text-[#8B949E] text-left space-y-2">
                  <div className="font-semibold text-text-primary flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    안내 사항
                  </div>
                  <p className="leading-relaxed">
                    • 주소창에 직접 URL을 입력하셨거나 인증 링크가 만료된 경우 세션이 확인되지 않습니다.<br />
                    • 로그인 화면에서 <strong>[비밀번호 찾기]</strong>를 다시 요청해주세요.<br />
                    • 사내 폐쇄망 환경으로 외부 메일 수신이 어려운 경우, <strong>사내 관리자</strong>에게 비밀번호 초기화를 요청하시면 즉시 재설정할 수 있습니다.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full bg-brand-500 hover:bg-brand-500/90 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2"
                  >
                    로그인 화면으로 이동
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">새 비밀번호 설정</h2>
                  <p className="text-[#8B949E] text-sm">계정에서 사용할 새 비밀번호를 입력해주세요.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-danger/10 border border-danger/20 text-danger p-3.5 rounded-xl text-sm flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#8B949E]" htmlFor="new-password">
                      새 비밀번호 (6자 이상)
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8B949E] group-focus-within:text-brand-500 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        id="new-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-[#0D1117] border border-[#30363D] text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-[#8B949E]/40"
                        placeholder="••••••••"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#8B949E]" htmlFor="confirm-password">
                      새 비밀번호 확인
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8B949E] group-focus-within:text-brand-500 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-[#0D1117] border border-[#30363D] text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-[#8B949E]/40"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-brand-500/90 hover:shadow-[0_0_15px_rgba(14,165,233,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        비밀번호 변경 완료
                        <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-xs text-[#8B949E] hover:text-text-primary transition-colors"
                    >
                      로그인으로 돌아가기
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
