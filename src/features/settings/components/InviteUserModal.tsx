import React, { useState } from 'react';
import { useInvitations } from '../hooks/useInvitations';
import { Button, BaseInput } from '@/design-system';
import { X, Copy, Check } from 'lucide-react';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

export function InviteUserModal({ isOpen, onClose, companyId }: InviteUserModalProps) {
  const { createInvitation } = useInvitations();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await createInvitation(companyId, email, role);
      const link = `${window.location.origin}/#/signup?invite=${data.token}`;
      setInviteLink(link);
      setInviteCode(data.invite_code);
    } catch (err: any) {
      setError(err.message || '초대 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('user');
    setInviteLink(null);
    setInviteCode(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#30363D]">
          <h3 className="text-lg font-semibold text-[#E6EDF3]">직원 초대</h3>
          <button onClick={handleClose} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {!inviteLink ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8B949E]">이메일 주소</label>
                <BaseInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8B949E]">역할</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] text-[#E6EDF3] rounded-lg px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                >
                  <option value="user">일반 사용자</option>
                  <option value="admin">관리자</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  취소
                </Button>
                <Button type="submit" variant="primary" disabled={loading || !email}>
                  {loading ? '생성 중...' : '초대 생성'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={24} />
                </div>
                <h4 className="text-lg font-medium text-[#E6EDF3]">초대가 생성되었습니다!</h4>
                <p className="text-sm text-[#8B949E]">
                  초대받은 직원은 가입 시 아래의 코드를 입력하거나, 초대 링크를 통해 가입할 수 있습니다.
                </p>
              </div>

              {inviteCode && (
                <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-6 text-center">
                  <span className="text-sm text-[#8B949E] mb-2 block">초대 코드 (6자리)</span>
                  <div className="text-3xl font-bold tracking-[0.2em] text-brand uppercase">
                    {inviteCode}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-sm text-[#8B949E] block">또는 초대 링크 복사</span>
                <div className="flex items-center gap-2">
                  <BaseInput 
                    value={inviteLink}
                    readOnly
                    className="flex-1 bg-[#0D1117] font-mono text-sm"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCopy}
                    className="shrink-0 px-3"
                    title="복사하기"
                  >
                    {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button type="button" variant="primary" className="w-full" onClick={handleClose}>
                  완료
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
