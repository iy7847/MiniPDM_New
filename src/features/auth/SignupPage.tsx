import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/shared/services/supabase';
import { Lock, User, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatErrorMessage = (msg: string): string => {
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return '이미 가입되어 있는 계정(이메일)입니다.';
    }
    if (msg.includes('Password should be at least 6 characters')) {
      return '비밀번호는 최소 6자리 이상이어야 합니다.';
    }
    if (msg.includes('rate limit')) {
      return '요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.';
    }
    if (msg.includes('valid email')) {
      return '올바른 이메일 주소 형식이 아닙니다.';
    }
    return msg;
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('invite');
    if (token) {
      setInviteToken(token);
      verifyToken(token);
    } else {
      setError('유효하지 않은 접근입니다. 초대 링크를 통해 접속해주세요.');
    }
  }, [location.search]);

  const verifyToken = async (token: string) => {
    try {
      const { data, error } = await supabase.rpc('get_invitation_by_token', { p_token: token });
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('유효하지 않거나 만료된 초대 링크입니다.');
      }
      
      setEmail(data[0].email);
    } catch (err: any) {
      setError(formatErrorMessage(err.message || '초대 정보를 불러올 수 없습니다.'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken) return;

    setError(null);
    setIsAlreadyRegistered(false);
    setLoading(true);
    try {
      // 1. Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          }
        }
      });

      if (signUpError) throw signUpError;
      
      if (!authData.user) {
        throw new Error('회원가입에 실패했습니다.');
      }

      // 2. Accept invitation
      const { error: acceptError } = await supabase.rpc('accept_invitation', { 
        p_token: inviteToken, 
        p_user_id: authData.user.id 
      });

      if (acceptError) throw acceptError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } });
      }, 3000);
      
    } catch (err: any) {
      const rawMsg = err.message || '';
      if (rawMsg.includes('already registered') || rawMsg.includes('already been registered')) {
        setIsAlreadyRegistered(true);
      }
      setError(formatErrorMessage(rawMsg || '회원가입 처리 중 오류가 발생했습니다.'));
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
            팀에 합류하세요
          </h2>
          <p className="text-[#8B949E] text-lg leading-relaxed max-w-md animate-in fade-in slide-in-from-bottom-5 duration-700 delay-150">
            초대받은 계정으로 가입하여 MiniPDM의 강력한 통합 관리 시스템을 경험해보세요.
          </p>
        </div>
      </div>

      {/* Right Column: Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        <div className="absolute lg:hidden inset-0 opacity-30">
          <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
          <div className="lg:hidden flex flex-col items-center justify-center gap-4 mb-10">
            <div className="flex items-center justify-center w-14 h-14 bg-[#161B22] text-brand-500 rounded-2xl border border-brand-500/30 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
              <Activity size={28} />
            </div>
            <span className="text-3xl font-bold tracking-tight">MiniPDM</span>
          </div>

          <div className="bg-[#161B22]/80 backdrop-blur-xl p-8 rounded-2xl border border-[#30363D] shadow-2xl">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">가입 완료!</h3>
                <p className="text-[#8B949E] mb-6">계정 설정이 완료되었습니다.<br/>잠시 후 로그인 페이지로 이동합니다.</p>
              </div>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">직원 가입</h2>
                  <p className="text-[#8B949E] text-sm">기본 정보를 입력하고 설정을 완료하세요.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm space-y-2 animate-in fade-in shrink-0">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                        <div className="flex-1 font-medium leading-relaxed">{error}</div>
                      </div>
                      {isAlreadyRegistered && (
                        <div className="pt-2 pl-3.5 border-t border-red-500/20 flex items-center justify-between gap-2">
                          <span className="text-xs text-[#8B949E]">
                            이미 계정이 있으신가요?
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate('/login', { state: { email } })}
                            className="text-xs font-semibold text-brand-400 hover:text-brand-300 underline flex items-center gap-1 shrink-0"
                          >
                            로그인 화면으로 이동
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#8B949E]" htmlFor="email">초대받은 이메일</label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="w-full bg-[#0D1117] border border-[#30363D] text-[#8B949E] rounded-lg px-4 py-2.5 opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#8B949E]" htmlFor="name">이름 (실명)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8B949E] group-focus-within:text-brand-500 transition-colors">
                        <User size={18} />
                      </div>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={!inviteToken}
                        className="w-full bg-[#0D1117] border border-[#30363D] text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-[#8B949E]/40"
                        placeholder="홍길동"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#8B949E]" htmlFor="password">비밀번호</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8B949E] group-focus-within:text-brand-500 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={!inviteToken}
                        className="w-full bg-[#0D1117] border border-[#30363D] text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-[#8B949E]/40"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !inviteToken || !email}
                    className="w-full bg-brand-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-brand-500/90 hover:shadow-[0_0_15px_rgba(14,165,233,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none disabled:hover:shadow-none"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        가입 완료 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
