import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  Calendar, 
  Check, 
  Clock, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  FileText,
  UserCheck,
  UserPlus,
  Crown
} from 'lucide-react';
import { Button, BaseInput, BizNoInput, PhoneInput, Card, Badge } from '@/design-system';
import { masterService } from '../services/masterService';
import type { MasterCompanyItem, CompanyUserItem, CompanyInviteItem } from '../services/masterService';
import { toast } from '@/shared/stores/useToastStore';

interface CompanyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: MasterCompanyItem | null;
  onUpdated: () => void;
}

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  isOpen,
  onClose,
  company,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'INFO' | 'USERS'>('INFO');
  
  // 가입 정보 폼 상태
  const [name, setName] = useState('');
  const [bizNum, setBizNum] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fax, setFax] = useState('');
  const [address, setAddress] = useState('');
  
  // 소속 사용자 및 초대 목록 상태
  const [users, setUsers] = useState<CompanyUserItem[]>([]);
  const [invites, setInvites] = useState<CompanyInviteItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !company) return;

    // 폼 초기값 채우기
    setName(company.companyName || '');
    setBizNum(company.bizNum || '');
    setCeoName(company.ceoName || '');
    setEmail(company.email || company.masterEmail || '');
    setPhone(company.phone || '');
    setFax(company.fax || '');
    setAddress(company.address || '');
    setActiveTab('INFO');

    // 사용자 목록 로드
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const { users: userList, invites: inviteList } = await masterService.fetchCompanyUsers(company.companyId);
        setUsers(userList);
        setInvites(inviteList);
      } catch (err: any) {
        console.error('소속 사용자 목록 로드 실패:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [isOpen, company]);

  if (!isOpen || !company) return null;

  // 가입 정보 저장 핸들러
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('고객사(업체명)는 필수 입력 항목입니다.');
      return;
    }

    setIsSaving(true);
    try {
      await masterService.updateCompanyInfo(company.companyId, {
        name: name.trim(),
        biz_num: bizNum.trim() || null,
        ceo_name: ceoName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        fax: fax.trim() || null,
        address: address.trim() || null,
      });

      toast.success(`[${name.trim()}] 가입 정보가 성공적으로 저장되었습니다.`);
      onUpdated();
    } catch (err: any) {
      toast.error('가입 정보 저장 실패: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-bg-surface border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-elevated/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-primary">{company.companyName}</h2>
                <span className="px-2 py-0.5 rounded font-black text-[10px] bg-brand-500/10 border border-brand-500/30 text-brand-400">
                  {company.plan}
                </span>
                {company.isBlocked ? (
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-red-500/15 text-red-400 border border-red-500/30">
                    이용 정지 / 만료
                  </span>
                ) : company.isTrial ? (
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    체험판
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    정상 이용
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                고객사 기본 가입 정보 및 소속 사용자 계정 관리
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center border-b border-border-default bg-bg-surface px-6 shrink-0">
          <button
            onClick={() => setActiveTab('INFO')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'INFO'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            기업 기본 및 가입 정보
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'USERS'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            소속 사용자 계정 ({users.length}명)
            {invites.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                대기 {invites.length}
              </span>
            )}
          </button>
        </div>

        {/* 본문 영역 */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'INFO' ? (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BaseInput
                  label="고객사(업체명) *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: (주)케이이피"
                  required
                />

                <BizNoInput
                  label="사업자 등록번호"
                  value={bizNum}
                  onChange={setBizNum}
                  placeholder="000-00-00000"
                />

                <BaseInput
                  label="대표자명"
                  value={ceoName}
                  onChange={(e) => setCeoName(e.target.value)}
                  placeholder="예: 홍길동"
                />

                <BaseInput
                  label="가입 / 대표 이메일"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="master@company.com"
                  leftIcon={<Mail className="w-4 h-4 text-text-secondary" />}
                />

                <PhoneInput
                  label="대표 전화번호"
                  value={phone}
                  onChange={setPhone}
                  placeholder="02-0000-0000 또는 010-0000-0000"
                />

                <BaseInput
                  label="팩스 번호 (FAX)"
                  value={fax}
                  onChange={(e) => setFax(e.target.value)}
                  placeholder="02-000-0000"
                />

                <div className="md:col-span-2">
                  <BaseInput
                    label="사업장 주소"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="사업장 소재지 주소 입력..."
                    leftIcon={<MapPin className="w-4 h-4 text-text-secondary" />}
                  />
                </div>
              </div>

              {/* 부가 메타 정보 */}
              <div className="mt-6 p-4 rounded-xl bg-bg-elevated/40 border border-border-default/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-text-tertiary block">최초 가입일자</span>
                  <span className="font-semibold text-text-primary mt-1 block">
                    {company.createdAt ? new Date(company.createdAt).toLocaleString('ko-KR') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-text-tertiary block">라이선스 만료일</span>
                  <span className="font-semibold text-text-primary mt-1 block">
                    {company.expiresAt ? new Date(company.expiresAt).toLocaleDateString('ko-KR') : '무제한'}
                  </span>
                </div>
                <div>
                  <span className="text-text-tertiary block">최대 허용 계정 수</span>
                  <span className="font-semibold text-text-primary mt-1 block">
                    {company.maxUsers}명 (현재 {company.totalUsersCount}명)
                  </span>
                </div>
                <div>
                  <span className="text-text-tertiary block">마스터 대표 계정</span>
                  <span className="font-semibold text-brand-400 mt-1 block truncate" title={company.masterEmail || email || '-'}>
                    {company.masterEmail || email || '-'}
                  </span>
                </div>
              </div>

              {/* 저장 액션 버튼 */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border-default mt-6">
                <Button variant="secondary" size="md" type="button" onClick={onClose}>
                  닫기
                </Button>
                <Button variant="primary" size="md" type="submit" disabled={isSaving}>
                  {isSaving ? '저장 중...' : '가입 정보 저장'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* 등록된 사용자 테이블 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    등록된 사내 계정 목록 ({users.length}명)
                  </h3>
                </div>

                <div className="border border-border-default rounded-xl overflow-hidden bg-bg-surface">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-bg-elevated/70 border-b border-border-default text-text-secondary font-semibold">
                        <th className="py-2.5 px-3">사용자 성명</th>
                        <th className="py-2.5 px-3">로그인 이메일</th>
                        <th className="py-2.5 px-3">역할/권한</th>
                        <th className="py-2.5 px-3">직책</th>
                        <th className="py-2.5 px-3">연락처</th>
                        <th className="py-2.5 px-3 text-right">계정 등록일</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-text-secondary">
                            사용자 목록을 불러오는 중입니다...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-text-secondary">
                            등록된 사용자가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => {
                          const isMaster = u.role === 'master' || u.role === 'admin';
                          return (
                            <tr key={u.id} className="hover:bg-bg-elevated/30 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-text-primary flex items-center gap-1.5">
                                {isMaster && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                                {u.name || '(이름 없음)'}
                              </td>
                              <td className="py-2.5 px-3 text-text-primary font-mono">{u.email}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isMaster 
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                                    : 'bg-bg-elevated text-text-secondary border-border-default'
                                }`}>
                                  {u.role === 'master' ? '마스터' : u.role === 'admin' ? '관리자' : '일반'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-text-secondary">{u.job_title || '-'}</td>
                              <td className="py-2.5 px-3 text-text-secondary">{u.phone || '-'}</td>
                              <td className="py-2.5 px-3 text-right text-text-secondary">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 초대 대기 목록 (있을 경우만) */}
              {invites.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-amber-400" />
                      초대 발송 후 대기 중인 계정 ({invites.length}명)
                    </h3>
                  </div>

                  <div className="border border-border-default rounded-xl overflow-hidden bg-bg-surface">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-bg-elevated/70 border-b border-border-default text-text-secondary font-semibold">
                          <th className="py-2.5 px-3">초대 이메일</th>
                          <th className="py-2.5 px-3">부여 역할</th>
                          <th className="py-2.5 px-3">발송일시</th>
                          <th className="py-2.5 px-3 text-right">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {invites.map((inv) => (
                          <tr key={inv.id} className="hover:bg-bg-elevated/30 transition-colors">
                            <td className="py-2.5 px-3 text-text-primary font-mono">{inv.email}</td>
                            <td className="py-2.5 px-3 text-text-secondary">{inv.role}</td>
                            <td className="py-2.5 px-3 text-text-secondary">
                              {inv.created_at ? new Date(inv.created_at).toLocaleString('ko-KR') : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                가입 대기중
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
