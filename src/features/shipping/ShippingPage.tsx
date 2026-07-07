import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { BaseInput as Input } from '../../design-system/BaseInput';
import { Search, Truck } from 'lucide-react';

const MOCK_SHIPMENTS = [
  { id: 'SHP-2401-001', orderId: 'ORD-2401-002', client: '알파산업', projectName: '서포트 브라켓', address: '경기도 시흥시 정왕동 123', status: '출하대기', date: '2026-07-08' },
  { id: 'SHP-2401-002', orderId: 'ORD-2401-005', client: '베타테크', projectName: '프레임 용접물', address: '인천광역시 남동구 고잔동 456', status: '배송중', date: '2026-07-07' },
  { id: 'SHP-2401-003', orderId: 'ORD-2401-010', client: '감마기공', projectName: '샤프트 10종', address: '경기도 안산시 단원구 성곡동 789', status: '완료', date: '2026-07-05' },
];

export const ShippingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredShipments = MOCK_SHIPMENTS.filter(ship => 
    ship.client.includes(searchTerm) || ship.projectName.includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">출하 관리</h1>
          <p className="text-text-secondary mt-1">출하 대기 및 배송 중인 품목을 관리합니다.</p>
        </div>
      </div>

      <Card className="flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>출하 목록</CardTitle>
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
          <div className="grid grid-cols-1 gap-4">
            {filteredShipments.map((ship) => (
              <div key={ship.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border-default rounded-lg hover:bg-bg-elevated/50 transition-colors gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-500/10 rounded-full text-brand-500 shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-text-secondary">{ship.id}</span>
                      <Badge 
                        variant={ship.status === '완료' ? 'success' : ship.status === '배송중' ? 'warning' : 'default'}
                      >
                        {ship.status}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">{ship.client} - {ship.projectName}</h3>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-1">{ship.address}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                  <span className="text-sm text-text-secondary whitespace-nowrap">예정/완료일: {ship.date}</span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="secondary" className="flex-1 sm:flex-none">명세서 인쇄</Button>
                    <Button variant="primary" className="flex-1 sm:flex-none">상태 변경</Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredShipments.length === 0 && (
              <div className="py-12 text-center text-text-secondary">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
