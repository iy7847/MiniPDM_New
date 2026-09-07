import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Crown, 
  Building2, 
  Search, 
  RefreshCw, 
  Plus, 
  Clock, 
  Users, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import { PageHeader } from '@/design-system/PageHeader';
import { Button, Card, BaseInput } from '@/design-system';
import { masterService } from '../services/masterService';
import type { MasterCompanyItem } from '../services/masterService';
import { AddCompanyModal } from '../components/AddCompanyModal';
import { ChangeExpiryModal } from '../components/ChangeExpiryModal';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { toast } from '@/shared/stores/useToastStore';

export const MasterLicensePage: React.FC = () => {
  const [companies, setCompanies] = useState<MasterCompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRING' | 'BLOCKED'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
  const [selectedCompanyForExpiry, setSelectedCompanyForExpiry] = useState<MasterCompanyItem | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [tempMemo, setTempMemo] = useState('');

  const { confirm } = useConfirm();

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const list = await masterService.fetchAllCompanies();
      setCompanies(list);
    } catch (err: any) {
      toast.error('고객사 목록을 불러오지 못했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // 통계 집계
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter(c => c.status === 'ACTIVE' && !c.isExpired).length;
    const trial = companies.filter(c => c.status === 'TRIAL' && !c.isExpired).length;
    const expiring = companies.filter(c => c.isExpiringSoon || c.isGracePeriod).length;
    const blocked = companies.filter(c => c.isBlocked).length;
    return { total, active, trial, expiring, blocked };
  }, [companies]);

  // 필터링
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchSearch = 
        !search ||
        c.companyName.toLowerCase().includes(search.toLowerCase()) ||
        c.ceoName.toLowerCase().includes(search.toLowerCase()) ||
        c.bizNum.includes(search) ||
        c.billingMemo.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'ACTIVE') return c.status === 'ACTIVE' && !c.isExpired;
      if (statusFilter === 'TRIAL') return c.status === 'TRIAL' && !c.isExpired;
      if (statusFilter === 'EXPIRING') return c.isExpiringSoon || c.isGracePeriod;
      if (statusFilter === 'BLOCKED') return c.isBlocked;

      return true;
    });
  }, [companies, search, statusFilter]);

  // 원클릭 30일 연장
  const handleExtendDays = async (company: MasterCompanyItem, days: number) => {
    const ok = await confirm({
      title: `라이선스 ${days}일 연장`,
      description: `[${company.companyName}]의 라이선스를 ${days}일 연장하고 정상(ACTIVE) 상태로 전환하시겠습니까?`,
      confirmLabel: '연장 적용',
    });
    if (!ok) return;

    try {
      await masterService.extendLicense(company.companyId, days);
      toast.success(`[${company.companyName}] 라이선스가 ${days}일 연장되었습니다.`);
      loadCompanies();
    } catch (err: any) {
      toast.error('연장 처리 실패: ' + err.message);
    }
  };

  // 체험판 30일 재설정
  const handleResetTrial = async (company: MasterCompanyItem) => {
    const ok = await confirm({
      title: '체험판 30일 재부여',
      description: `[${company.companyName}]의 라이선스를 오늘부터 30일간 무료 체험(TRIAL)으로 재설정하시겠습니까?`,
      confirmLabel: '체험판 재설정',
    });
    if (!ok) return;

    try {
      await masterService.resetToTrial(company.companyId, 30);
      toast.success(`[${company.companyName}] 체험판 30일이 재설정되었습니다.`);
      loadCompanies();
    } catch (err: any) {
      toast.error('체험판 재설정 실패: ' + err.message);
    }
  };

  // 상태 변경 (정상 ↔ 이용 정지)
  const handleToggleSuspended = async (company: MasterCompanyItem) => {
    const isSuspending = company.status !== 'SUSPENDED';
    const ok = await confirm({
      title: isSuspending ? '업체 이용 정지 (차단)' : '업체 이용 정지 해제',
      description: isSuspending
        ? `[${company.companyName}]의 상태를 '이용 정지(SUSPENDED)'로 전환합니다. 고객사 프로그램 전체가 즉각 잠금 처리됩니다. 계속하시겠습니까?`
        : `[${company.companyName}]의 이용 정지를 해제하고 정상(ACTIVE) 상태로 전환하시겠습니까?`,
      confirmLabel: isSuspending ? '이용 정지 실행' : '정지 해제',
      isDanger: isSuspending,
    });
    if (!ok) return;

    try {
      await masterService.updateLicense(company.companyId, {
        license_status: isSuspending ? 'SUSPENDED' : 'ACTIVE',
      });
      toast.success(`[${company.companyName}] 상태가 변경되었습니다.`);
      loadCompanies();
    } catch (err: any) {
      toast.error('상태 변경 실패: ' + err.message);
    }
  };

  // 최대 계정 수 변경
  const handleUpdateMaxUsers = async (company: MasterCompanyItem, delta: number) => {
    const newMax = Math.max(1, company.maxUsers + delta);
    try {
      await masterService.updateLicense(company.companyId, { max_users: newMax });
      toast.success(`[${company.companyName}] 최대 사용자 수가 ${newMax}명으로 변경되었습니다.`);
      loadCompanies();
    } catch (err: any) {
      toast.error('계정 수 변경 실패: ' + err.message);
    }
  };

  // 메모 인라인 저장
  const handleSaveMemo = async (companyId: string) => {
    try {
      await masterService.updateLicense(companyId, { billing_memo: tempMemo });
      toast.success('관리자 메모가 저장되었습니다.');
      setEditingMemoId(null);
      loadCompanies();
    } catch (err: any) {
      toast.error('메모 저장 실패: ' + err.message);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 최상단 헤더 */}
      <PageHeader
        icon={Crown}
        title="👑 KEP 고객사 라이선스 마스터 관리"
        description="MiniPDM v2.0을 도입한 전국 고객사의 계약 기한, 체험 기간, 계정 수, 결제 상태를 중앙에서 직접 제어합니다."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={loadCompanies}
              className="flex items-center gap-1.5"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-400 font-bold"
            >
              <Plus className="w-4 h-4" />
              신규 고객사 등록
            </Button>
          </div>
        }
      />

      {/* KPI 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-bg-surface border-border-default">
          <div className="text-xs text-text-secondary font-medium">전체 고객사</div>
          <div className="text-2xl font-black text-text-primary mt-1 flex items-baseline gap-1">
            {stats.total} <span className="text-xs font-normal text-text-secondary">개사</span>
          </div>
        </Card>
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            정상 이용 (ACTIVE)
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1 flex items-baseline gap-1">
            {stats.active} <span className="text-xs font-normal text-emerald-400/70">개사</span>
          </div>
        </Card>
        <Card className="p-4 bg-brand-500/10 border-brand-500/20">
          <div className="text-xs text-brand-400 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            체험판 (TRIAL)
          </div>
          <div className="text-2xl font-black text-brand-400 mt-1 flex items-baseline gap-1">
            {stats.trial} <span className="text-xs font-normal text-brand-400/70">개사</span>
          </div>
        </Card>
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="text-xs text-amber-400 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            만료 임박 (D-7)
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1 flex items-baseline gap-1">
            {stats.expiring} <span className="text-xs font-normal text-amber-400/70">개사</span>
          </div>
        </Card>
        <Card className="p-4 bg-red-500/10 border-red-500/20">
          <div className="text-xs text-red-400 font-semibold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            이용 잠금 / 정지
          </div>
          <div className="text-2xl font-black text-red-400 mt-1 flex items-baseline gap-1">
            {stats.blocked} <span className="text-xs font-normal text-red-400/70">개사</span>
          </div>
        </Card>
      </div>

      {/* 검색 및 필터 탭 */}
      <Card className="p-4 bg-bg-surface border-border-default flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-bg-elevated p-1 rounded-xl border border-border-default shrink-0 overflow-x-auto">
          {[
            { id: 'ALL', label: '전체 보기', count: stats.total },
            { id: 'ACTIVE', label: '정상 이용', count: stats.active },
            { id: 'TRIAL', label: '체험판', count: stats.trial },
            { id: 'EXPIRING', label: '만료 임박', count: stats.expiring },
            { id: 'BLOCKED', label: '잠금/정지', count: stats.blocked },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
              }`}
            >
              {tab.label}
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full md:w-80">
          <BaseInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="업체명, 대표자, 사업자번호, 메모 검색..."
            leftIcon={<Search className="w-4 h-4 text-text-secondary" />}
          />
        </div>
      </Card>

      {/* 고객사 리스트 테이블 (Full-Width) */}
      <Card className="overflow-hidden border-border-default bg-bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-default bg-bg-elevated/70 text-text-secondary font-semibold">
                <th className="py-3.5 px-4">고객사(업체명)</th>
                <th className="py-3.5 px-3">플랜</th>
                <th className="py-3.5 px-3">라이선스 상태</th>
                <th className="py-3.5 px-3">만료 예정일 (D-Day)</th>
                <th className="py-3.5 px-3">사용자 현황</th>
                <th className="py-3.5 px-3 min-w-[200px]">계약 / 입금 메모</th>
                <th className="py-3.5 px-4 text-right">라이선스 제어 액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-secondary">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-400" />
                    고객사 라이선스 데이터를 동기화하는 중입니다...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-secondary">
                    일치하는 고객사 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((c) => {
                  const isSuspended = c.status === 'SUSPENDED';
                  const isBlocked = c.isBlocked;

                  return (
                    <tr 
                      key={c.companyId}
                      className={`hover:bg-bg-elevated/40 transition-colors ${
                        isBlocked ? 'bg-red-950/10' : ''
                      }`}
                    >
                      {/* 업체명 */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg border ${
                            c.isMasterVendor 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                              : 'bg-bg-elevated border-border-default text-text-primary'
                          }`}>
                            {c.isMasterVendor ? <Crown className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary flex items-center gap-1.5">
                              {c.companyName}
                              {c.isMasterVendor && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-black border border-amber-500/30">
                                  KEP 본사
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-text-secondary">
                              {c.ceoName ? `대표: ${c.ceoName}` : ''} {c.bizNum ? `(${c.bizNum})` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 플랜 */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-black text-[11px] border ${
                          c.plan === 'PRO'
                            ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                            : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                        }`}>
                          {c.plan}
                        </span>
                      </td>

                      {/* 상태 */}
                      <td className="py-3.5 px-3">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                            <XCircle className="w-3 h-3" /> 이용 정지
                          </span>
                        ) : c.isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                            <ShieldAlert className="w-3 h-3" /> 기간 만료
                          </span>
                        ) : c.isGracePeriod ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" /> 결제 유예 중
                          </span>
                        ) : c.isTrial ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            <Clock className="w-3 h-3" /> 체험판
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> 정상 이용
                          </span>
                        )}
                      </td>

                      {/* 만료일 & 잔여일수 (클릭 시 달력 모달) */}
                      <td className="py-3.5 px-3">
                        <div 
                          onClick={() => {
                            setSelectedCompanyForExpiry(c);
                            setIsExpiryModalOpen(true);
                          }}
                          className="cursor-pointer group inline-flex items-center gap-1.5 hover:text-brand-400 transition-colors"
                          title="클릭하여 만료일 직접 지정"
                        >
                          <div className="font-semibold text-text-primary group-hover:text-brand-400 transition-colors">
                            {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ko-KR') : '무제한'}
                          </div>
                          <Calendar className="w-3.5 h-3.5 text-text-secondary group-hover:text-brand-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {c.expiresAt && (
                          <div className={`text-[11px] font-bold mt-0.5 ${
                            c.daysRemaining <= 0 
                              ? 'text-red-400' 
                              : c.daysRemaining <= 7 
                              ? 'text-amber-400' 
                              : 'text-text-secondary'
                          }`}>
                            {c.daysRemaining <= 0 
                              ? `만료됨 (${Math.abs(c.daysRemaining)}일 경과)` 
                              : `${c.daysRemaining}일 남음`}
                          </div>
                        )}
                      </td>

                      {/* 사용자 현황 */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            c.totalUsersCount >= c.maxUsers ? 'text-amber-400' : 'text-text-primary'
                          }`}>
                            {c.totalUsersCount} / {c.maxUsers}명
                          </span>
                          {!c.isMasterVendor && (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleUpdateMaxUsers(c, -1)}
                                className="w-5 h-5 flex items-center justify-center rounded bg-bg-elevated hover:bg-border-default text-text-secondary hover:text-text-primary text-[10px] font-bold"
                                title="1명 감소"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleUpdateMaxUsers(c, 1)}
                                className="w-5 h-5 flex items-center justify-center rounded bg-bg-elevated hover:bg-border-default text-text-secondary hover:text-text-primary text-[10px] font-bold"
                                title="1명 추가"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-text-secondary">
                          (활성 {c.registeredUsersCount} + 대기 {c.pendingInvitesCount})
                        </div>
                      </td>

                      {/* 메모 */}
                      <td className="py-3.5 px-3">
                        {editingMemoId === c.companyId ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempMemo}
                              onChange={(e) => setTempMemo(e.target.value)}
                              className="w-full bg-bg-base border border-brand-500 rounded px-2 py-1 text-xs text-text-primary focus:outline-none"
                              placeholder="계약/입금 메모..."
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveMemo(c.companyId)}
                              className="px-2 py-1 bg-brand-500 text-white rounded text-[10px] font-bold shrink-0"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingMemoId(null)}
                              className="px-1.5 py-1 text-text-secondary hover:text-text-primary text-[10px] shrink-0"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingMemoId(c.companyId);
                              setTempMemo(c.billingMemo || '');
                            }}
                            className="cursor-pointer group flex items-center gap-1.5 text-text-secondary hover:text-text-primary py-1 px-1.5 rounded hover:bg-bg-elevated transition-colors"
                            title="클릭하여 메모 수정"
                          >
                            <span className="truncate max-w-[220px] text-[11px]">
                              {c.billingMemo || '(메모 없음 - 클릭하여 추가)'}
                            </span>
                            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 text-brand-400" />
                          </div>
                        )}
                      </td>

                      {/* 액션 컨트롤러 */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedCompanyForExpiry(c);
                              setIsExpiryModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-bg-elevated hover:bg-brand-500/20 hover:text-brand-300 border border-border-default hover:border-brand-500/30 text-text-secondary hover:text-text-primary font-bold text-[11px] flex items-center gap-1 transition-colors"
                            title="달력에서 만료일 직접 지정"
                          >
                            <Calendar className="w-3 h-3 text-brand-400" />
                            날짜 지정
                          </button>
                          <button
                            onClick={() => handleExtendDays(c, 30)}
                            className="px-2.5 py-1.5 rounded-lg bg-bg-elevated hover:bg-brand-500/20 hover:text-brand-300 border border-border-default hover:border-brand-500/30 text-text-primary font-bold text-[11px] transition-colors"
                            title="30일 연장 및 정상 활성화"
                          >
                            +30일
                          </button>
                          <button
                            onClick={() => handleExtendDays(c, 365)}
                            className="px-2.5 py-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500 hover:text-white border border-brand-500/30 text-brand-300 font-bold text-[11px] transition-all"
                            title="1년(365일) 연장 및 정상 활성화"
                          >
                            +1년 연장
                          </button>
                          <button
                            onClick={() => handleResetTrial(c)}
                            className="px-2 py-1.5 rounded-lg bg-bg-elevated hover:bg-bg-surface text-text-secondary hover:text-text-primary border border-border-default text-[11px] transition-colors"
                            title="체험판 30일 재설정"
                          >
                            체험 30일
                          </button>
                          {!c.isMasterVendor && (
                            <button
                              onClick={() => handleToggleSuspended(c)}
                              className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                                isSuspended
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                  : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                              }`}
                              title={isSuspended ? '이용 정지 해제' : '미납/정지 처리'}
                            >
                              {isSuspended ? '정지 해제' : '정지'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 신규 고객사 등록 모달 */}
      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          toast.success('신규 고객사가 등록되었습니다.');
          loadCompanies();
        }}
      />

      {/* 만료일 직접 지정 달력 모달 */}
      <ChangeExpiryModal
        isOpen={isExpiryModalOpen}
        onClose={() => {
          setIsExpiryModalOpen(false);
          setSelectedCompanyForExpiry(null);
        }}
        company={selectedCompanyForExpiry}
        onSuccess={loadCompanies}
      />
    </div>
  );
};
