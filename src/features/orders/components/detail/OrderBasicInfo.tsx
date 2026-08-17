import React from 'react';
import { Card, BaseInput, Badge, CurrencyToggle } from '../../../../design-system';
import type { Order } from '../../types';

interface OrderBasicInfoProps {
  order: Order;
  showForeign: boolean;
  setShowForeign: (val: boolean) => void;
  onUpdateField: (field: keyof Order, value: string | number) => void;
  isLocked?: boolean;
}

export const OrderBasicInfo: React.FC<OrderBasicInfoProps> = ({ 
  order, 
  showForeign, 
  setShowForeign,
  onUpdateField,
  isLocked
}) => {
  return (
    <div className="px-6 pb-4">
      <div className="flex flex-wrap items-center gap-4 bg-bg-elevated/20 px-4 py-2.5 rounded-lg border border-border-default/50">
        
        {/* PO Number Edit (Read Only) */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-secondary whitespace-nowrap">PO 번호</label>
          <input
            type="text"
            className="w-[110px] bg-bg-base border border-border-default text-text-secondary rounded h-8 text-xs px-2 outline-none font-medium opacity-80 cursor-not-allowed"
            value={order.po_no || ''}
            disabled
            placeholder="자동 발급"
          />
        </div>

        {/* Order Date Edit (Read Only) */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-secondary whitespace-nowrap">수주일</label>
          <input
            type="date"
            className="bg-bg-base border border-border-default text-text-secondary rounded h-8 text-xs px-2 outline-none opacity-80 cursor-not-allowed"
            value={order.order_date ? new Date(order.order_date).toISOString().slice(0, 10) : ''}
            disabled
          />
        </div>

        {/* Delivery Date Edit (Read Only) */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-secondary whitespace-nowrap">납기일</label>
          <input
            type="date"
            className="bg-bg-base border border-border-default text-text-secondary rounded h-8 text-xs px-2 outline-none opacity-80 cursor-not-allowed"
            value={order.delivery_date ? new Date(order.delivery_date).toISOString().slice(0, 10) : ''}
            disabled
          />
        </div>

        {/* Currency (Read Only) */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-secondary whitespace-nowrap">통화</label>
          <select
            className="bg-bg-base border border-border-default text-text-secondary rounded h-8 text-xs px-2 outline-none min-w-[70px] opacity-80 cursor-not-allowed"
            value={order.currency || 'KRW'}
            disabled
          >
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="JPY">JPY</option>
            <option value="CNY">CNY</option>
          </select>
        </div>

        {/* Exchange Rate (Read Only) */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-secondary whitespace-nowrap">환율</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-[80px] bg-bg-base border border-border-default text-text-secondary rounded h-8 text-xs px-2 outline-none opacity-80 cursor-not-allowed text-right"
              value={order.exchange_rate || 1}
              disabled
            />
            {order.currency !== 'KRW' && (
              <CurrencyToggle 
                isForeignMode={showForeign} 
                onToggle={() => setShowForeign(!showForeign)} 
                currency={order.currency} 
              />
            )}
          </div>
        </div>

        {/* Note */}
        <div className="flex-1 min-w-[200px] flex items-center gap-2">
          <label className="text-xs font-medium text-text-secondary whitespace-nowrap">특이사항</label>
          <input
            className={`w-full bg-bg-surface border border-border-default rounded h-8 text-xs px-3 outline-none focus:border-brand-500 text-text-primary ${isLocked ? 'opacity-80 cursor-not-allowed' : ''}`}
            value={order.note || ''}
            onChange={(e) => onUpdateField('note', e.target.value)}
            placeholder="수주 관련 특이사항 입력..."
            disabled={isLocked}
          />
        </div>
      </div>
    </div>
  );
};
