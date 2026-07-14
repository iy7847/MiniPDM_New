import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/services/supabase';
import { useClients } from './hooks/useClients';
import { Button } from '@/design-system/Button';
import { Tabs } from '@/design-system/Tabs';
import { ClientModal } from './components/ClientModal';
import type { Client, ClientFormData } from '@/shared/types/client';
import { Building2, Search, Plus, MapPin, Globe } from 'lucide-react';

export function ClientsPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const { clients, loading, fetchClients, saveClient, deleteClient } = useClients();

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('company_id, role')
          .eq('id', user.id)
          .single();
        if (data?.company_id) {
          setCompanyId(data.company_id);
          setUserRole(data.role);
          fetchClients(data.company_id);
        }
      }
    }
    fetchUserData();
  }, [user, fetchClients]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredClients = clients.filter(client => {
    const matchesTab = 
      activeTab === 'ALL' || 
      (activeTab === 'CUSTOMER' && (client.client_type === 'CUSTOMER' || client.client_type === 'BOTH')) ||
      (activeTab === 'SUPPLIER' && (client.client_type === 'SUPPLIER' || client.client_type === 'BOTH'));
      
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (client.biz_num && client.biz_num.includes(searchTerm));
      
    return matchesTab && matchesSearch;
  });

  const handleOpenModal = (client?: Client) => {
    setEditClient(client || null);
    setIsModalOpen(true);
  };

  const handleSaveClient = async (formData: ClientFormData, editId?: string) => {
    if (!companyId) return;
    try {
      await saveClient(companyId, formData, editId);
      showNotification(editId ? '거래처가 성공적으로 수정되었습니다.' : '거래처가 성공적으로 등록되었습니다.', 'success');
    } catch (err: any) {
      throw err; // Modal will handle and show error
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      showNotification('삭제 권한이 없습니다.', 'error');
      return;
    }
    if (!window.confirm(`정말 [${name}] 업체를 삭제하시겠습니까? 관련된 내역이 있을 경우 삭제가 불가능할 수 있습니다.`)) return;

    if (!companyId) return;
    
    try {
      await deleteClient(companyId, id);
      showNotification('성공적으로 삭제되었습니다.', 'success');
    } catch (err: any) {
      showNotification(`삭제 실패: ${err.message}`, 'error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-base relative text-text-primary">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-bg-base/80 border-b border-border-default px-4 py-4 md:px-8">
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-7 h-7 text-text-primary" />
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-text-primary">거래처 관리</h1>
            </div>
            {(userRole === 'admin' || userRole === 'super_admin') && (
              <Button
                variant="primary"
                onClick={() => handleOpenModal()}
                className="shadow-glow h-[42px] px-4 font-bold"
              >
                <Plus className="w-4 h-4 mr-1.5" /> 업체 등록
              </Button>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <Tabs
              tabs={[
                { id: 'ALL', label: '전체 보기' },
                { id: 'CUSTOMER', label: '매출처 (고객사)' },
                { id: 'SUPPLIER', label: '매입/외주처' }
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
            
            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-text-secondary" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="상호명 또는 사업자번호 검색"
                className="w-full pl-10 pr-3 py-2 border border-border-strong rounded-xl bg-bg-elevated text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium placeholder:text-text-disabled"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="w-full space-y-6">
          {notification && (
            <div className={`p-4 rounded-2xl text-center text-sm font-black shadow-soft border animate-in fade-in slide-in-from-top-4 duration-300 ${
              notification.type === 'success' ? 'bg-success-bg text-success border-success' : 'bg-danger-bg text-danger border-danger'
            }`}>
              {notification.type === 'success' ? '✅ ' : '❌ '}
              {notification.message}
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-bold text-text-secondary">
              총 <span className="text-brand-500">{filteredClients.length}</span>개 업체
            </span>
          </div>

          <div className="bg-bg-surface border border-border-default rounded-2xl shadow-soft overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-default bg-bg-elevated">
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider whitespace-nowrap">분류</th>
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider whitespace-nowrap">국가/통화</th>
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">거래처명</th>
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider whitespace-nowrap">사업자/Tax ID</th>
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">담당자</th>
                    <th className="px-6 py-4 text-xs font-black text-text-secondary uppercase tracking-wider">연락처</th>
                    <th className="px-6 py-4 text-center text-xs font-black text-text-secondary uppercase tracking-wider whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {loading ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-text-disabled font-bold">데이터를 불러오는 중입니다...</td></tr>
                  ) : filteredClients.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-text-disabled font-bold">등록된 거래처가 없습니다.</td></tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-bg-overlay/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {client.client_type === 'CUSTOMER' && <span className="px-2 py-1 rounded bg-brand-50 text-brand-600 text-[11px] font-black border border-brand-100">매출처</span>}
                          {client.client_type === 'SUPPLIER' && <span className="px-2 py-1 rounded bg-orange-50 text-orange-600 text-[11px] font-black border border-orange-100">매입/외주처</span>}
                          {client.client_type === 'BOTH' && <span className="px-2 py-1 rounded bg-purple-50 text-purple-600 text-[11px] font-black border border-purple-100">공통</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-1.5 items-center">
                            {client.is_foreign ? (
                              <span className="flex items-center gap-1 bg-danger-bg text-danger px-2 py-1 rounded text-[11px] font-black border border-danger-border"><Globe size={10} />{client.country}</span>
                            ) : (
                              <span className="flex items-center gap-1 bg-bg-elevated text-text-secondary px-2 py-1 rounded text-[11px] font-black border border-border-strong"><MapPin size={10} />KR</span>
                            )}
                            <span className="bg-brand-50 text-brand-600 px-2 py-1 rounded text-[11px] font-black border border-brand-100">{client.currency || 'KRW'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-text-primary">{client.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-text-secondary font-mono text-sm">{client.biz_num || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-text-primary text-sm">{client.manager_name || '-'}</span>
                            <span className="text-xs text-text-disabled">{client.manager_email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-text-secondary font-mono text-sm">{client.manager_phone || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="secondary" size="sm" className="h-8 px-3 text-xs" onClick={() => handleOpenModal(client)}>수정</Button>
                            {(userRole === 'admin' || userRole === 'super_admin') && (
                              <Button variant="danger" size="sm" className="h-8 px-3 text-xs" onClick={() => handleDelete(client.id, client.name)}>삭제</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden flex flex-col divide-y divide-border-default">
              {loading ? (
                <div className="py-12 text-center text-text-disabled font-bold">데이터를 불러오는 중입니다...</div>
              ) : filteredClients.length === 0 ? (
                <div className="py-12 text-center text-text-disabled font-bold">등록된 업체가 없습니다.</div>
              ) : (
                filteredClients.map((client) => (
                  <div key={client.id} className="p-4 active:bg-bg-overlay/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {client.client_type === 'CUSTOMER' && <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-600 text-[10px] font-black border border-brand-100">매출처</span>}
                          {client.client_type === 'SUPPLIER' && <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px] font-black border border-orange-100">매입/외주처</span>}
                          {client.client_type === 'BOTH' && <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-black border border-purple-100">공통</span>}
                          
                          {client.is_foreign ? (
                            <span className="bg-danger-bg text-danger px-2 py-0.5 rounded text-[10px] font-black border border-danger-border">{client.country}</span>
                          ) : (
                            <span className="bg-bg-elevated text-text-secondary px-2 py-0.5 rounded text-[10px] font-black border border-border-strong">KR</span>
                          )}
                          <span className="bg-brand-50 text-brand-600 px-2 py-0.5 rounded text-[10px] font-black border border-brand-100">{client.currency || 'KRW'}</span>
                        </div>
                        <h4 className="text-lg font-black text-text-primary">{client.name}</h4>
                      </div>
                    </div>
                    
                    <div className="bg-bg-elevated p-3 rounded-lg border border-border-default space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary font-bold">사업자/Tax ID</span>
                        <span className="font-mono text-text-primary font-bold">{client.biz_num || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary font-bold">담당자</span>
                        <span className="text-text-primary font-bold">{client.manager_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary font-bold">연락처</span>
                        <span className="font-mono text-text-primary font-bold">{client.manager_phone || '-'}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenModal(client)}>수정</Button>
                      {(userRole === 'admin' || userRole === 'super_admin') && (
                        <Button variant="danger" size="sm" onClick={() => handleDelete(client.id, client.name)}>삭제</Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveClient}
          editClient={editClient}
        />
      )}
    </div>
  );
}
