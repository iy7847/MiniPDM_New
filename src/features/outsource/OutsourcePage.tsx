import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';
import { Mail, ExternalLink } from 'lucide-react';

const MOCK_OUTSOURCE_ORDERS = [
  { id: 'ORD-2607-001', partner: '제일열처리', item: 'Main Base Plate 외 2건', process: '열처리', date: '2026-07-03', status: '대기' },
  { id: 'ORD-2607-002', partner: '한국도금', item: 'Guide Shaft 100EA', process: '도금(흑색)', date: '2026-07-03', status: '발송완료' },
];

export const OutsourcePage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">외주 발주 관리</h1>
          <p className="text-text-secondary mt-1">외주업체로 보낼 발주 내역을 관리하고 링크를 공유합니다.</p>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>외주 발주 대기열</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-elevated sticky top-0 border-b border-border-default">
              <tr>
                <th className="p-4 font-medium text-text-secondary">발주번호</th>
                <th className="p-4 font-medium text-text-secondary">거래처(외주사)</th>
                <th className="p-4 font-medium text-text-secondary">품목 요약</th>
                <th className="p-4 font-medium text-text-secondary">공정</th>
                <th className="p-4 font-medium text-text-secondary">발주일</th>
                <th className="p-4 font-medium text-text-secondary">상태</th>
                <th className="p-4 font-medium text-text-secondary text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_OUTSOURCE_ORDERS.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border-default/50 hover:bg-bg-elevated/50 transition-colors"
                >
                  <td className="p-4 font-medium text-text-primary">{order.id}</td>
                  <td className="p-4 font-bold text-brand-500">{order.partner}</td>
                  <td className="p-4 text-text-primary">{order.item}</td>
                  <td className="p-4 text-text-secondary">{order.process}</td>
                  <td className="p-4 text-text-secondary">{order.date}</td>
                  <td className="p-4">
                    <Badge variant={order.status === '대기' ? 'default' : 'success'}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => window.open(`/shared/order/${order.id}`, '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        미리보기
                      </Button>
                      <Button size="sm" variant="primary">
                        <Mail className="w-4 h-4 mr-2" />
                        이메일 발송
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
