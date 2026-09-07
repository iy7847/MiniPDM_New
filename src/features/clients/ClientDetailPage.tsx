import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  FileText,
  MapPin,
  Globe,
  Search,
  Calendar,
  DollarSign,
  Package,
  Layers,
  Edit3,
  ExternalLink
} from 'lucide-react';
import { Card } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { BaseInput } from '@/design-system/BaseInput';
import { DetailHeader } from '@/design-system/DetailHeader';
import { useClientDetail } from './hooks/useClientDetail';
import { ClientModal } from './components/ClientModal';
import { useClients } from './hooks/useClients';
import type { ClientFormData } from '@/shared/types/client';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { client, orders, estimates, priceHistory, loading, reload } = useClientDetail(id);
  const { saveClient } = useClients();

  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'price'>('info');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const filteredPriceHistory = priceHistory.filter(
    (item) =>
      item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.spec.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveClient = async (formData: ClientFormData, editId?: string) => {
    if (!client?.company_id) return;
    await saveClient(client.company_id, formData, editId);
    reload();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-text-secondary">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mb-3"></div>
        <span>거래처 상세 정보를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-danger">거래처를 찾을 수 없습니다.</h2>
        <p className="text-text-muted text-sm">해당 거래처가 삭제되었거나 존재하지 않는 ID입니다.</p>
        <Button onClick={() => navigate('/clients')}>거래처 목록으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 상단 브레드크럼 & 헤더 */}
      <div className="bg-bg-surface border-b border-border-default -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-6 shadow-sm">
        <DetailHeader
          title={
            <div className="flex items-center gap-2">
              <Building2 size={22} className="text-brand-400" />
              <span>{client.name}</span>
            </div>
          }
          statusBadge={
            <>
              {client.client_type === 'CUSTOMER' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  매출처 (고객사)
                </span>
              )}
              {client.client_type === 'SUPPLIER' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-warning/10 text-warning border border-warning/20">
                  매입/외주처
                </span>
              )}
              {client.client_type === 'BOTH' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  공통 거래처
                </span>
              )}
            </>
          }
          subtitle={
            <div className="text-xs text-text-muted flex items-center gap-3 font-mono">
              <span>사업자번호: {client.biz_num || '미등록'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {client.is_foreign ? <Globe size={12} /> : <MapPin size={12} />}
                {client.country || 'KR'} ({client.currency || 'KRW'})
              </span>
            </div>
          }
          onBack={() => navigate('/clients')}
          primaryActions={
            <>
              <Button
                variant="secondary"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Edit3 size={15} />
                <span>정보 수정</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/estimates')}
                className="flex items-center gap-1.5 shadow-glow"
              >
                <FileText size={15} />
                <span>신규 견적 작성</span>
              </Button>
            </>
          }
        />
      </div>

      {/* 3대 탭 네비게이션 */}
      <div className="flex gap-2 border-b border-border-default">
        {[
          { id: 'info', label: '🏢 기본 정보' },
          { id: 'history', label: `📜 수주/견적 거래 내역 (${orders.length + estimates.length})` },
          { id: 'price', label: `🏷️ 납품 품목 단가 이력 (${priceHistory.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-sm font-bold transition-all border-b-2 relative top-[1px] flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400 bg-brand-500/5 rounded-t-lg'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* [1] 기본 정보 탭 */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-text-primary border-b border-border-default pb-2.5 flex items-center gap-2">
              <Building2 size={18} className="text-brand-400" />
              <span>사업자 및 회사 정보</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-text-muted block">상호명 (업체명)</span>
                <span className="font-bold text-text-primary">{client.name}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">사업자등록번호</span>
                <span className="font-mono text-text-primary">{client.biz_num || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">거래처 구분</span>
                <span className="font-medium text-text-primary">
                  {client.client_type === 'CUSTOMER' ? '매출처' : client.client_type === 'SUPPLIER' ? '매입/외주처' : '공통'}
                </span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">국가 및 기준 통화</span>
                <span className="font-mono text-text-primary">{client.country || 'KR'} / {client.currency || 'KRW'}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">국내/해외 구분</span>
                <span className="font-medium text-text-primary">{client.is_foreign ? '해외 업체' : '국내 업체'}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">등록일시</span>
                <span className="font-mono text-text-secondary">
                  {client.created_at ? new Date(client.created_at).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-text-primary border-b border-border-default pb-2.5 flex items-center gap-2">
              <Phone size={18} className="text-brand-400" />
              <span>담당자 연락처 정보</span>
            </h3>

            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <span className="text-xs text-text-muted block">담당자 이름</span>
                <span className="font-bold text-text-primary">{client.manager_name || '미등록'}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">연락처 (전화번호)</span>
                <span className="font-mono text-text-primary">{client.manager_phone || '미등록'}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">이메일 주소</span>
                <span className="font-mono text-text-primary">{client.manager_email || '미등록'}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* [2] 수주/견적 거래 내역 탭 */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* 수주 내역 */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-brand-400" />
                <h3 className="text-base font-bold text-text-primary">수주 내역 ({orders.length}건)</h3>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="py-10 text-center text-text-muted text-sm">
                등록된 수주 내역이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-bg-elevated text-text-secondary border-b border-border-default text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">발주번호 (PO)</th>
                      <th className="px-4 py-3">수주일자</th>
                      <th className="px-4 py-3">납기일</th>
                      <th className="px-4 py-3 text-right">수주 총액</th>
                      <th className="px-4 py-3 text-center">진행 상태</th>
                      <th className="px-4 py-3 text-center">이동</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-bg-elevated/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-text-primary">
                          {ord.po_no || ord.order_number}
                        </td>
                        <td className="px-4 py-3 font-mono text-text-secondary">{ord.order_date || '-'}</td>
                        <td className="px-4 py-3 font-mono text-text-secondary">{ord.delivery_date || '-'}</td>
                        <td className="px-4 py-3 font-mono font-bold text-right text-brand-400">
                          ₩{Number(ord.total_amount || 0).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-bg-elevated border border-border-default text-text-secondary">
                            {ord.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => navigate(`/orders?search=${encodeURIComponent(ord.po_no || '')}`)}
                            className="p-1 text-text-secondary hover:text-brand-400 transition-colors"
                            title="수주 관리로 이동"
                          >
                            <ExternalLink size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* 견적서 내역 */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-warning" />
                <h3 className="text-base font-bold text-text-primary">견적서 내역 ({estimates.length}건)</h3>
              </div>
            </div>

            {estimates.length === 0 ? (
              <div className="py-10 text-center text-text-muted text-sm">
                등록된 견적 내역이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-bg-elevated text-text-secondary border-b border-border-default text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">견적번호</th>
                      <th className="px-4 py-3">프로젝트명</th>
                      <th className="px-4 py-3">작성일시</th>
                      <th className="px-4 py-3 text-right">견적 총액</th>
                      <th className="px-4 py-3 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {estimates.map((est) => (
                      <tr key={est.id} className="hover:bg-bg-elevated/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-text-primary">
                          {est.quotation_no}
                        </td>
                        <td className="px-4 py-3 font-medium text-text-primary">{est.project_name || '-'}</td>
                        <td className="px-4 py-3 font-mono text-text-secondary">
                          {est.created_at ? new Date(est.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-right text-text-primary">
                          ₩{Number(est.total_amount || 0).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-bg-elevated border border-border-default text-text-secondary">
                            {est.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* [3] 품목별 단가 이력 탭 */}
      {activeTab === 'price' && (
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Layers size={18} className="text-brand-400" />
                <span>납품 품목 및 수주 단가 이력</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                해당 거래처의 전체 수주에서 납품된 부품별 규격과 최종 수주 단가 내역입니다.
              </p>
            </div>

            <div className="w-full sm:w-72 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="도면번호, 품명, 규격 검색..."
                className="w-full pl-9 pr-3 py-2 bg-bg-elevated border border-border-default rounded-xl text-sm text-text-primary outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {filteredPriceHistory.length === 0 ? (
            <div className="py-16 text-center text-text-muted text-sm">
              납품된 품목 단가 이력이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-bg-elevated text-text-secondary border-b border-border-default text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3">수주일자</th>
                    <th className="px-4 py-3">발주번호</th>
                    <th className="px-4 py-3">도면번호</th>
                    <th className="px-4 py-3">품명</th>
                    <th className="px-4 py-3">재질</th>
                    <th className="px-4 py-3">규격 (Size)</th>
                    <th className="px-4 py-3 text-right">수량</th>
                    <th className="px-4 py-3 text-right">수주 단가</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {filteredPriceHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-elevated/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-text-secondary">{item.orderDate || '-'}</td>
                      <td className="px-4 py-3 font-mono text-text-secondary">{item.poNo}</td>
                      <td className="px-4 py-3 font-mono font-bold text-text-primary">{item.partNo}</td>
                      <td className="px-4 py-3 font-medium text-text-primary">{item.partName}</td>
                      <td className="px-4 py-3 text-text-secondary font-mono">{item.material}</td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-xs">{item.spec}</td>
                      <td className="px-4 py-3 font-mono text-right">{item.qty}개</td>
                      <td className="px-4 py-3 font-mono font-bold text-right text-brand-400">
                        ₩{item.unitPrice.toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 정보 수정 모달 */}
      <ClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveClient}
        editClient={client}
      />
    </div>
  );
};
