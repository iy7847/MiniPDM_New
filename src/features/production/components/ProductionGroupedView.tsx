import React from 'react';
import { Package, CheckSquare, Square, Hammer } from 'lucide-react';
import { Button, Badge } from '../../../design-system';
import { ProductionTableComponent, calculateDDay } from './ProductionTableComponent';

export interface ProductionGroupedViewProps {
  groupedOrders: {
    poNo: string;
    clientName: string;
    deliveryDate?: string;
    items: any[];
  }[];
  selectedItemIds: Set<string>;
  onSelectOrderGroup: (groupItems: any[]) => void;
  onProceedOrderGroup: (groupItems: any[]) => void;
  onToggleItem: (id: string) => void;
  onToggleSelectAll: (items: any[]) => void;
  onOpenMasking: (file: any, itemId?: string) => void;
  onOpenDesignModal: (itemId: string) => void;
  onOpenProcessDetail: (item: any) => void;
  onQtyBlur: (item: any, value: string) => void;
  onUpdateSupplyConfig: (itemId: string, config: any) => void;
}

export const ProductionGroupedView: React.FC<ProductionGroupedViewProps> = ({
  groupedOrders,
  selectedItemIds,
  onSelectOrderGroup,
  onProceedOrderGroup,
  onToggleItem,
  onToggleSelectAll,
  onOpenMasking,
  onOpenDesignModal,
  onOpenProcessDetail,
  onQtyBlur,
  onUpdateSupplyConfig,
}) => {
  return (
    <div className="flex flex-col gap-5">
      {groupedOrders.map(group => {
        const totalPcs = group.items.reduce((sum, i) => sum + (i.production_qty ?? i.qty ?? 0), 0);
        const selectableItems = group.items.filter(i => {
          const status = i.production_status || 'PENDING';
          return status === 'PENDING' || status.endsWith('_READY');
        });
        const allGroupSelected = selectableItems.length > 0 && selectableItems.every(i => selectedItemIds.has(i.id));
        const hasPendingInGroup = group.items.some(i => i.production_status === 'PENDING' || !i.production_status);
        const dday = calculateDDay(group.deliveryDate);

        return (
          <div 
            key={group.poNo}
            className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm transition-all"
          >
            {/* 수주 그룹 헤더 */}
            <div className="px-5 py-3.5 bg-bg-elevated/90 border-b border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                      {group.poNo}
                    </span>
                    <span className="font-bold text-text-primary text-sm tracking-wide">
                      {group.clientName}
                    </span>
                    <Badge variant="primary" className="text-[10px] px-2 py-0.5">
                      {group.items.length}개 품목
                    </Badge>
                    {group.deliveryDate && (
                      <Badge variant={dday.variant} className="text-[10px] px-1.5 py-0.5 font-mono">
                        납기: {group.deliveryDate.split('T')[0]} ({dday.text})
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-1 font-mono">
                    총 생산 수량: <span className="font-bold text-brand-400">{totalPcs.toLocaleString()}</span>개
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs px-2.5"
                  disabled={selectableItems.length === 0}
                  onClick={() => onSelectOrderGroup(group.items)}
                >
                  {allGroupSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-brand-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 mr-1.5 text-text-tertiary" />
                  )}
                  이 수주 전체 선택
                </Button>

                {hasPendingInGroup && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-8 text-xs font-semibold px-3 shadow-sm bg-brand-500 hover:bg-brand-600 text-white"
                    onClick={() => onProceedOrderGroup(group.items)}
                  >
                    <Hammer className="w-3.5 h-3.5 mr-1.5" />
                    이 수주 일괄 진행
                  </Button>
                )}
              </div>
            </div>

            {/* 수주 품목 테이블 */}
            <ProductionTableComponent
              items={group.items}
              selectedItemIds={selectedItemIds}
              onToggleItem={onToggleItem}
              onToggleSelectAll={onToggleSelectAll}
              onOpenMasking={onOpenMasking}
              onOpenDesignModal={onOpenDesignModal}
              onOpenProcessDetail={onOpenProcessDetail}
              onQtyBlur={onQtyBlur}
              onUpdateSupplyConfig={onUpdateSupplyConfig}
            />
          </div>
        );
      })}
    </div>
  );
};
