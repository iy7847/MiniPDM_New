import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from './services/authService';
import { Lock, Mail, Activity, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.login({ email, password });
      navigate('/');
    } catch (err: any) {
      setError(err.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0D1117] text-[#E6EDF3] selection:bg-brand-500 selection:text-white">
      {/* Left Column: Brand Intro */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#161B22] border-r border-[#30363D] flex-col justify-between p-12 lg:p-24">
        {/* Abstract background blobs */}
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
            스마트 제조의<br />새로운 기준
          </h2>
          <p className="text-[#8B949E] text-lg leading-relaxed max-w-md animate-in fade-in slide-in-from-bottom-5 duration-700 delay-150">
            소규모 금속 가공 제조업체를 위한 통합 관리 시스템. 견적부터 수주, 생산, 출하까지 한 곳에서 효율적으로 관리하세요.
          </p>
        </div>

        <div className="relative z-10 border-l-2 border-brand-500 pl-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <p className="text-sm text-[#8B949E]">
            "기존 프로세스의 병목을 해소하고, 데이터 기반의 의사결정을 지원합니다."
          </p>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Mobile background effect */}
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
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">환영합니다</h2>
              <p className="text-[#8B949E] text-sm">계정에 로그인하여 작업을 계속하세요.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8B949E]" htmlFor="email">이메일</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8B949E] group-focus-within:text-brand-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#0D1117] border border-[#30363D] text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-[#8B949E]/40"
                    placeholder="admin@minipdm.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#8B949E]" htmlFor="password">비밀번호</label>
                  <a href="#" className="text-xs text-brand-500 hover:text-brand-500/80 transition-colors">비밀번호 찾기</a>
                </div>
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
                    className="w-full bg-[#0D1117] border border-[#30363D] text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-[#8B949E]/40"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-brand-500/90 hover:shadow-[0_0_15px_rgba(14,165,233,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none disabled:hover:shadow-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    로그인 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
