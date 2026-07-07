import React, { useState } from 'react';
import { Button, Card } from '../../design-system';
import { Plus, Building2, Phone, Mail } from 'lucide-react';

type ClientType = 'CUSTOMER' | 'PARTNER';

interface Client {
  id: string;
  type: ClientType;
  name: string;
  bizNo: string;
  representative: string;
  phone: string;
  email: string;
}

const DUMMY_CLIENTS: Client[] = [
  {
    id: '1',
    type: 'CUSTOMER',
    name: '현대자동차',
    bizNo: '101-81-09147',
    representative: '정의선',
    phone: '02-3464-1114',
    email: 'contact@hyundai.com',
  },
  {
    id: '2',
    type: 'CUSTOMER',
    name: '기아자동차',
    bizNo: '119-81-02316',
    representative: '송호성',
    phone: '02-3464-1114',
    email: 'contact@kia.com',
  },
  {
    id: '3',
    type: 'PARTNER',
    name: '대성금속',
    bizNo: '123-45-67890',
    representative: '김대성',
    phone: '031-123-4567',
    email: 'daesung@metal.com',
  },
  {
    id: '4',
    type: 'PARTNER',
    name: '미래정공',
    bizNo: '234-56-78901',
    representative: '이명재',
    phone: '032-987-6543',
    email: 'mirae@junggong.com',
  }
];

export const ClientsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ClientType>('CUSTOMER');

  const filteredClients = DUMMY_CLIENTS.filter(client => client.type === activeTab);

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">거래처 관리</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">고객사 및 매입처/외주처를 관리합니다.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />}>
          신규 거래처 등록
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'CUSTOMER'
              ? 'text-[var(--color-brand)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          onClick={() => setActiveTab('CUSTOMER')}
        >
          고객사
          {activeTab === 'CUSTOMER' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand)] rounded-t" />
          )}
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'PARTNER'
              ? 'text-[var(--color-brand)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          onClick={() => setActiveTab('PARTNER')}
        >
          매입처/외주처
          {activeTab === 'PARTNER' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand)] rounded-t" />
          )}
        </button>
      </div>

      {/* List */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--color-bg-bg-overlay)] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]">상호명</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]">사업자번호</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]">대표자</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]">연락처</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]">이메일</th>
                <th className="px-6 py-3 font-medium text-[var(--color-text-secondary)]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-[var(--color-bg-bg-overlay)] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-medium text-[var(--color-text-primary)]">
                      <Building2 size={16} className="text-[var(--color-text-secondary)]" />
                      {client.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{client.bizNo}</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{client.representative}</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Phone size={14} />
                      {client.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Mail size={14} />
                      {client.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      수정
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--color-text-secondary)]">
                    등록된 거래처가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
