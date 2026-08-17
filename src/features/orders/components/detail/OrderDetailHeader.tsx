import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ClipboardPaste, Printer, Trash2, FileCheck, Download } from 'lucide-react';
import { Button, Badge, SaveButton, DetailHeader } from '../../../../design-system';
import { getCurrencySymbol } from '../../../../shared/utils/currency';
import type { Order } from '../../types';
import type { OrderItem } from '../../../../shared/types/database';

interface OrderDetailHeaderProps {
  order: Order;
  items?: OrderItem[];
  itemsCount: number;
  totalAmount: number;
  isForeignMode: boolean;
  currency: string;
  isLocked?: boolean;
  onOpenOrderNoGenerator: () => void;
  onOpenClipboardMatch: () => void;
  onOpenPdfModal?: () => void;
  onExportExcel?: () => void;
  onOrderConfirm?: () => void;
  onDeleteOrder: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
}

export const OrderDetailHeader: React.FC<OrderDetailHeaderProps> = ({ 
  order, 
  items = [],
  itemsCount,
  totalAmount,
  isForeignMode,
  currency,
  isLocked,
  onOpenOrderNoGenerator,
  onOpenClipboardMatch,
  onOpenPdfModal,
  onExportExcel,
  onOrderConfirm,
  onDeleteOrder,
  onSave,
  isSaving,
  isDirty
}) => {
  const navigate = useNavigate();

  let statusLabel = order.status as string;
  let statusVariant: any = 'default';
  
  const hasReadyItems = items.some(i => i.production_status === 'PRODUCTION_READY');
  
  if (order.status === 'ORDERED' || order.status === 'PENDING') { 
    if (hasReadyItems) {
      statusLabel = '부분 이관됨';
      statusVariant = 'warning';
    } else {
      statusLabel = '수주등록'; 
      statusVariant = 'primary'; 
    }
  }
  else if (order.status === 'PRODUCTION') { statusLabel = '생산중'; statusVariant = 'warning'; }
  else if (order.status === 'INSPECTION') { statusLabel = '출하대기'; statusVariant = 'success'; }
  else if (order.status === 'DONE' || order.status === 'COMPLETED') { statusLabel = '완료'; statusVariant = 'default'; }

  return (
    <DetailHeader
      title={`수주 상세 (${order.po_no || order.order_number})`}
      statusBadge={
        <>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {order.shipping_status === 'shipped' && <Badge variant="success">출하완료</Badge>}
          {order.shipping_status === 'partially_shipped' && <Badge variant="warning">부분출하</Badge>}
        </>
      }
      subtitle={
        <>
          <span>{(order as any).clients?.name || '고객사 미지정'}</span>
          <span className="mx-2 text-border-default/50">|</span>
          <span>{order.project_name || '프로젝트 미지정'}</span>
        </>
      }
      onBack={() => navigate('/orders')}
      centerContent={
        <div className="flex items-center gap-4 bg-bg-elevated/30 py-1.5 px-4 rounded-lg border border-border-default/50">
          <div className="text-right flex items-center gap-3">
            <div className="text-xs text-text-secondary font-medium">총 수주 금액</div>
            <div className="text-2xl font-bold text-brand-400 leading-none">
              {(isForeignMode && (order.exchange_rate || 0) > 0 ? totalAmount / order.exchange_rate : totalAmount).toLocaleString(undefined, isForeignMode ? { maximumFractionDigits: 2, minimumFractionDigits: 2 } : {})} <span className="text-base font-normal text-brand-400/70 ml-0.5">{isForeignMode ? getCurrencySymbol(currency) : '₩'}</span>
            </div>
          </div>
        </div>
      }
      primaryActions={
        <>
          {!isLocked && onSave && (
            <SaveButton
              isSaving={!!isSaving}
              isDirty={isDirty}
              onSave={onSave}
            />
          )}
          <Button 
            variant={isLocked ? "outline" : "primary"} 
            className="gap-2 font-bold"
            onClick={onOrderConfirm || (() => navigate('/production'))}
            disabled={order.status === 'COMPLETED'}
          >
            <Send size={16} />
            {isLocked ? '이관 취소' : '생산 이관'}
          </Button>
        </>
      }
    >
      {/* Utility Actions */}
      <div className="grid grid-cols-2 gap-x-1 gap-y-1 mr-2">
        {onOpenPdfModal && (
          <Button variant="ghost" className="text-text-secondary hover:text-text-primary gap-1 px-2 py-0.5 h-7 text-[11px] justify-start" onClick={onOpenPdfModal}>
            <FileCheck size={14} /> 수주확인서
          </Button>
        )}
        {onExportExcel && (
          <Button variant="ghost" className="text-text-secondary hover:text-text-primary gap-1 px-2 py-0.5 h-7 text-[11px] justify-start" onClick={onExportExcel}>
            <Download size={14} /> 엑셀 저장
          </Button>
        )}
        {!isLocked && (
          <Button variant="ghost" className="text-text-secondary hover:text-text-primary gap-1 px-2 py-0.5 h-7 text-[11px] justify-start" onClick={onOpenClipboardMatch}>
            <ClipboardPaste size={14} /> 엑셀 매칭
          </Button>
        )}
      </div>
      {!isLocked && (
        <>
          <DetailHeader.Divider />
          <Button variant="outline" className="text-status-danger border-status-danger hover:bg-status-danger/10" onClick={onDeleteOrder}>
            <Trash2 size={16} />
          </Button>
          <DetailHeader.Divider />
        </>
      )}
    </DetailHeader>
  );
};
