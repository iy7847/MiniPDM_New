import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { BaseInput as Input } from '../../design-system/BaseInput';
import { Search, Filter, ArrowRight } from 'lucide-react';

const MOCK_ORDERS = [
  { id: 'ORD-2401-001', client: '테스트기업', projectName: '메인 베이스 가공', amount: 1500000, deliveryDate: '2026-07-10', status: '생산중' },
  { id: 'ORD-2401-002', client: '알파산업', projectName: '서포트 브라켓', amount: 850000, deliveryDate: '2026-07-08', status: '출하대기' },
  { id: 'ORD-2401-003', client: '제타정밀', projectName: '지그 어셈블리', amount: 3200000, deliveryDate: '2026-07-15', status: '수주등록' },
];

const calculateDDay = (targetDate: string) => {
  const target = new Date(targetDate).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  const diff = target - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return { text: `D+${Math.abs(days)}`, variant: 'danger' as const };
  if (days === 0) return { text: 'D-Day', variant: 'danger' as const };
  if (days <= 3) return { text: `D-${days}`, variant: 'warning' as const };
  return { text: `D-${days}`, variant: 'default' as const };
};

export const OrdersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'전체' | '수주등록' | '생산중' | '출하대기'>('전체');

  const filteredOrders = MOCK_ORDERS.filter(order => {
    if (activeTab !== '전체' && order.status !== activeTab) return false;
    if (searchTerm && !order.client.includes(searchTerm) && !order.projectName.includes(searchTerm)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">수주 관리</h1>
          <p className="text-text-secondary mt-1">접수된 수주 내역을 확인하고 납기를 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary">수주 등록</Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-1 bg-bg-surface p-1 rounded-lg border border-border-default">
          {(['전체', '수주등록', '생산중', '출하대기'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab 
                  ? 'bg-bg-elevated text-text-primary shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <Card className="flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>수주 목록</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <Input 
              className="pl-9" 
              placeholder="고객사 또는 프로젝트 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default text-text-secondary">
                  <th className="py-3 px-4 font-medium">수주번호</th>
                  <th className="py-3 px-4 font-medium">고객사</th>
                  <th className="py-3 px-4 font-medium">프로젝트명</th>
                  <th className="py-3 px-4 font-medium">수주금액</th>
                  <th className="py-3 px-4 font-medium">납기일</th>
                  <th className="py-3 px-4 font-medium">상태</th>
                  <th className="py-3 px-4 font-medium text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const dday = calculateDDay(order.deliveryDate);
                  return (
                    <tr key={order.id} className="border-b border-border-default/50 hover:bg-bg-elevated/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text-primary">{order.id}</td>
                      <td className="py-3 px-4">{order.client}</td>
                      <td className="py-3 px-4">{order.projectName}</td>
                      <td className="py-3 px-4">{order.amount.toLocaleString()}원</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span>{order.deliveryDate}</span>
                          <Badge variant={dday.variant} className="text-xs">{dday.text}</Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default">{order.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          상세
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-secondary">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
