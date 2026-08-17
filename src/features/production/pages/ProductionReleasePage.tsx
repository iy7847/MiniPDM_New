import React, { useState } from 'react';
import { useStickySearchParams } from '../../../hooks/useStickySearchParams';
import { Card, Button, Toggle, BaseSelect, BaseInput, FloatingToolbar, Badge } from '../../../design-system';
import { Search, Hammer, ShoppingCart, CheckSquare, Square, Package, Calendar } from 'lucide-react';

const MOCK_ORDERS = [
  { id: 'ORD-2607-001', client: '삼성전자', date: '2026-07-26', status: 'PENDING' },
  { id: 'ORD-2607-002', client: 'LG디스플레이', date: '2026-07-26', status: 'IN_PROGRESS' },
  { id: 'ORD-2607-003', client: '현대자동차', date: '2026-07-25', status: 'PENDING' },
];

const MOCK_ITEMS = [
  { id: 'item1', name: 'Base Plate', size: '100x100x10', qty: 5, supply_type: 'INHOUSE', use_stock: false, material_order_id: null },
  { id: 'item2', name: 'Guide Rail', size: '200x50x5', qty: 10, supply_type: 'OUTSOURCE', use_stock: false, material_order_id: null },
  { id: 'item3', name: 'Sensor Bracket', size: '50x50x2', qty: 2, supply_type: 'PURCHASE', use_stock: true, material_order_id: 'MO-001' },
  { id: 'item4', name: 'Mounting Block', size: '30x30x30', qty: 15, supply_type: 'INHOUSE', use_stock: false, material_order_id: null },
];

export const ProductionReleasePage = () => {
  const [searchParams, setSearchParams] = useStickySearchParams('production_release_filters', { keyword: '' });
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(MOCK_ORDERS[0].id);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setSearchParams({ keyword: e.target.value });
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBundleOrder = () => {
    alert(`발주 모달 오픈! 선택된 아이템: ${Array.from(selectedItemIds).join(', ')}`);
    setSelectedItemIds(new Set());
  };

  const filteredOrders = MOCK_ORDERS.filter(o => 
    o.client.includes(keyword) || o.id.includes(keyword)
  );

  return (
    <div className="flex flex-col h-full bg-[#0D1117] text-[#E6EDF3] p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hammer className="text-brand-500" />
            생산 지시 (Production Release)
          </h1>
          <p className="text-text-secondary mt-1">수주 단위의 1-Depth BOM을 확인하고 조달 및 가공 지시를 내립니다.</p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left: Order List */}
        <Card className="w-1/3 flex flex-col p-0 overflow-hidden bg-bg-surface border-border-default h-full">
          <div className="p-4 border-b border-border-default">
            <BaseInput 
              leftIcon={<Search size={16} />}
              placeholder="수주 번호, 고객사 검색..."
              value={keyword}
              onChange={handleSearch}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center text-text-secondary py-8">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredOrders.map(order => (
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`p-4 rounded-md cursor-pointer border transition-all ${
                    selectedOrderId === order.id 
                      ? 'bg-brand-500/10 border-brand-500 shadow-soft' 
                      : 'bg-bg-elevated border-border-default hover:border-text-secondary hover:bg-bg-elevated/80'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-brand-300 text-lg">{order.id}</span>
                    <Badge variant={order.status === 'PENDING' ? 'warning' : 'primary'}>
                      {order.status === 'PENDING' ? '대기중' : '진행중'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <ShoppingCart size={14} />
                      <span>{order.client}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span>{order.date}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Right: Order Items (1-Depth BOM) */}
        <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-bg-surface border-border-default h-full">
          <div className="p-4 border-b border-border-default flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package size={18} className="text-text-secondary" /> 
              {selectedOrderId ? `${selectedOrderId} 품목 리스트` : '수주를 선택해주세요'}
            </h2>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-secondary uppercase bg-bg-elevated sticky top-0 z-10 shadow-sm border-b border-border-default">
                <tr>
                  <th className="px-5 py-4 w-12 text-center">
                    <CheckSquare size={16} className="text-text-disabled mx-auto" />
                  </th>
                  <th className="px-5 py-4">품명 및 규격</th>
                  <th className="px-5 py-4 w-20 text-center">수량</th>
                  <th className="px-5 py-4 w-36">조달 구분</th>
                  <th className="px-5 py-4 w-28 text-center">재고 사용</th>
                  <th className="px-5 py-4 w-28 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {MOCK_ITEMS.map(item => {
                  const isChecked = selectedItemIds.has(item.id);
                  const isOrdered = item.material_order_id !== null;
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors hover:bg-bg-elevated/50 ${isChecked ? 'bg-brand-500/5' : ''}`}
                    >
                      <td className="px-5 py-3 text-center">
                        {isOrdered ? (
                          <Square size={18} className="text-text-disabled cursor-not-allowed mx-auto" />
                        ) : (
                          <button 
                            onClick={() => toggleItem(item.id)} 
                            className="text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 rounded flex mx-auto transition-transform active:scale-95"
                          >
                            {isChecked ? <CheckSquare size={18} /> : <Square size={18} className="text-text-secondary" />}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-text-primary mb-1">{item.name}</div>
                        <div className="text-xs text-text-secondary font-mono">{item.size}</div>
                      </td>
                      <td className="px-5 py-3 text-center font-medium">
                        {item.qty}
                      </td>
                      <td className="px-5 py-3">
                        <BaseSelect
                          value={item.supply_type}
                          onChange={() => {}}
                          options={[
                            { value: 'INHOUSE', label: '사내 가공' },
                            { value: 'OUTSOURCE', label: '외주 제작' },
                            { value: 'PURCHASE', label: '기성품 구매' }
                          ]}
                          className="h-9"
                        />
                      </td>
                      <td className="px-5 py-3 text-center flex justify-center">
                        <Toggle 
                          checked={item.use_stock} 
                          onChange={() => {}} 
                        />
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isOrdered ? (
                          <Badge variant="success">발주됨</Badge>
                        ) : (
                          <Badge variant="default">미발주</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <FloatingToolbar 
        isVisible={selectedItemIds.size > 0}
        selectedCount={selectedItemIds.size}
        onClearSelection={() => setSelectedItemIds(new Set())}
      >
        <Button variant="primary" onClick={handleBundleOrder}>
          묶음 소재 발주
        </Button>
      </FloatingToolbar>
    </div>
  );
};
