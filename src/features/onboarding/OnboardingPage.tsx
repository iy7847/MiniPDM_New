import React, { useState } from 'react';
import { Card, Button, BaseInput } from '@/design-system';
import { Building2, KeyRound } from 'lucide-react';
import { useOnboarding } from './hooks/useOnboarding';

export const OnboardingPage: React.FC = () => {
  const { submitInviteCode, createNewCompany, loading, error } = useOnboarding();
  const [inviteCode, setInviteCode] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      await submitInviteCode(inviteCode);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    try {
      await createNewCompany(companyName);
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center p-6 text-[#E6EDF3]">
      <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl font-bold mb-4">환영합니다!</h1>
        <p className="text-[#8B949E] max-w-md mx-auto">
          MiniPDM을 시작하기 위해 팀에 합류하거나 새로운 회사를 등록해주세요.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-[#F85149]/10 border border-[#F85149]/20 rounded-md text-[#F85149] max-w-2xl w-full text-center animate-in fade-in">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Option 1: 초대 코드 입력 */}
        <Card className="p-8 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center mb-6">
            <KeyRound className="w-6 h-6 text-brand" />
          </div>
          <h2 className="text-xl font-bold mb-2">초대 코드 입력</h2>
          <p className="text-[#8B949E] mb-6 flex-grow">
            관리자로부터 받은 6자리 초대 코드를 입력하여 팀에 합류하세요.
          </p>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <BaseInput
              placeholder="예: A1B2C3"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              maxLength={6}
              disabled={loading}
              className="text-center text-xl tracking-widest uppercase"
            />
            <Button
              type="submit"
              fullWidth
              disabled={loading || inviteCode.length < 6}
            >
              팀에 합류하기
            </Button>
          </form>
        </Card>

        {/* Option 2: 새로운 회사 등록 */}
        <Card className="p-8 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center mb-6">
            <Building2 className="w-6 h-6 text-brand" />
          </div>
          <h2 className="text-xl font-bold mb-2">새로운 회사 등록</h2>
          <p className="text-[#8B949E] mb-6 flex-grow">
            새로운 워크스페이스를 만들고 팀원들을 초대하여 관리를 시작하세요.
          </p>
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <BaseInput
              placeholder="회사명 입력"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="outline"
              fullWidth
              disabled={loading || !companyName.trim()}
            >
              회사 등록하기
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
