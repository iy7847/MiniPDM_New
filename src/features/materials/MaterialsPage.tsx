import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';
import { PackagePlus, CheckSquare } from 'lucide-react';

const MOCK_MATERIALS = [
  { id: 1, name: 'S45C', type: '사각', size: '100x100x20', quantity: 5, status: '대기' },
  { id: 2, name: 'AL6061', type: '원형', size: 'Φ50x100', quantity: 10, status: '재고부족' },
  { id: 3, name: 'SUS304', type: '사각', size: '200x150x10', quantity: 2, status: '대기' },
];

export const MaterialsPage: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === MOCK_MATERIALS.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(MOCK_MATERIALS.map(m => m.id));
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">자재 관리</h1>
          <p className="text-text-secondary mt-1">소요 자재를 확인하고 발주 또는 사내 재고를 할당합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={selectedIds.length === 0}>
            <CheckSquare className="w-4 h-4 mr-2" />
            사내 재고 할당
          </Button>
          <Button variant="primary" disabled={selectedIds.length === 0}>
            <PackagePlus className="w-4 h-4 mr-2" />
            신규 발주
          </Button>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>자재 소요 목록</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-elevated sticky top-0 border-b border-border-default">
              <tr>
                <th className="p-4 font-medium text-text-secondary w-12 text-center">
                  <input
                    type="checkbox"
                    className="accent-brand w-4 h-4"
                    checked={selectedIds.length === MOCK_MATERIALS.length && MOCK_MATERIALS.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4 font-medium text-text-secondary">자재명</th>
                <th className="p-4 font-medium text-text-secondary">형태</th>
                <th className="p-4 font-medium text-text-secondary">규격</th>
                <th className="p-4 font-medium text-text-secondary">수량</th>
                <th className="p-4 font-medium text-text-secondary">상태</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_MATERIALS.map((material) => (
                <tr
                  key={material.id}
                  className="border-b border-border-default/50 hover:bg-bg-elevated/50 transition-colors cursor-pointer"
                  onClick={() => toggleSelect(material.id)}
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      className="accent-brand w-4 h-4 cursor-pointer"
                      checked={selectedIds.includes(material.id)}
                      onChange={() => {}} 
                      onClick={(e) => e.stopPropagation()} 
                    />
                  </td>
                  <td className="p-4 font-medium text-text-primary">{material.name}</td>
                  <td className="p-4 text-text-secondary">{material.type}</td>
                  <td className="p-4 text-text-secondary">{material.size}</td>
                  <td className="p-4 text-text-primary">{material.quantity}</td>
                  <td className="p-4">
                    <Badge variant={material.status === '대기' ? 'default' : 'danger'}>
                      {material.status}
                    </Badge>
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
