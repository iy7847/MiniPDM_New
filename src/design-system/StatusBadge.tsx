import React from 'react';
import { Badge, type BadgeProps } from './Badge';

export type StatusBadgeDomain = 
  | 'order' 
  | 'estimate' 
  | 'shipping' 
  | 'outsource_type' 
  | 'outsource_status' 
  | 'process' 
  | 'custom';

export interface StatusBadgeProps {
  type: StatusBadgeDomain;
  status: string | null | undefined;
  label?: React.ReactNode;
  variant?: BadgeProps['variant'];
  className?: string;
}

interface StatusConfig {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
  prefix?: string;
}

/**
 * 도메인별 상태 코드 매핑 테이블
 */
const STATUS_MAP: Record<StatusBadgeDomain, Record<string, StatusConfig>> = {
  order: {
    PENDING: { label: '수주등록', variant: 'primary' },
    수주등록: { label: '수주등록', variant: 'primary' },
    ORDERED: { label: '수주등록', variant: 'primary' },
    PARTIALLY_TRANSFERRED: { label: '부분이관', variant: 'warning' },
    '부분 이관됨': { label: '부분이관', variant: 'warning' },
    PRODUCTION: { label: '생산중', variant: 'warning' },
    생산중: { label: '생산중', variant: 'warning' },
    INSPECTION: { label: '출하대기', variant: 'info' },
    출하대기: { label: '출하대기', variant: 'info' },
    COMPLETED: { label: '완료', variant: 'success' },
    DONE: { label: '완료', variant: 'success' },
    완료: { label: '완료', variant: 'success' },
    출하완료: { label: '출하완료', variant: 'success' },
    CANCELLED: { label: '취소', variant: 'danger' },
    취소: { label: '취소', variant: 'danger' },
  },
  estimate: {
    DRAFT: { label: '작성중', variant: 'warning' },
    SENT: { label: '제출완료', variant: 'default' },
    ORDERED: { label: '수주완료', variant: 'success' },
    REJECTED: { label: '반려', variant: 'danger' },
  },
  shipping: {
    PENDING: { label: '출하대기', variant: 'default' },
    pending: { label: '출하대기', variant: 'default' },
    PARTIALLY_SHIPPED: { label: '부분출하', variant: 'warning' },
    partially_shipped: { label: '부분출하', variant: 'warning' },
    SHIPPED: { label: '출하완료', variant: 'success' },
    shipped: { label: '출하완료', variant: 'success' },
    CANCELLED: { label: '출하취소', variant: 'danger' },
  },
  outsource_type: {
    MATERIAL: { label: '소재 발주', variant: 'success', prefix: '📦' },
    FIELD: { label: '현장 반출', variant: 'secondary', prefix: '🛠️' },
    ADMIN: { label: '관리 발주', variant: 'info', prefix: '🏢' },
    PURCHASE: { label: '구매 발주', variant: 'primary', prefix: '🛒' },
    OUTSOURCE: { label: '외주 발주', variant: 'info', prefix: '🏢' },
  },
  outsource_status: {
    발주대기: { label: '발주대기', variant: 'default' },
    PENDING: { label: '발주대기', variant: 'default' },
    발주완료: { label: '발주완료', variant: 'info' },
    ORDERED: { label: '발주완료', variant: 'info' },
    수신확인: { label: '수신확인', variant: 'primary' },
    ACKNOWLEDGED: { label: '수신확인', variant: 'primary' },
    입고완료: { label: '입고완료', variant: 'success' },
    RECEIVED: { label: '입고완료', variant: 'success' },
    지연: { label: '지연', variant: 'danger' },
    DELAYED: { label: '지연', variant: 'danger' },
  },
  process: {
    OUTSOURCE: { label: '외주 공정', variant: 'primary' },
    true: { label: '외주 공정', variant: 'primary' },
    IN_HOUSE: { label: '사내 공정', variant: 'default' },
    false: { label: '사내 공정', variant: 'default' },
  },
  custom: {}
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  status,
  label: customLabel,
  variant: customVariant,
  className = ''
}) => {
  if (!status && !customLabel) return null;

  const statusKey = String(status ?? '').trim();
  const config = STATUS_MAP[type]?.[statusKey];

  const resolvedVariant = customVariant || config?.variant || 'default';
  const resolvedText = customLabel ?? config?.label ?? statusKey;
  const prefix = config?.prefix ? `${config.prefix} ` : '';

  return (
    <Badge variant={resolvedVariant} className={`whitespace-nowrap font-medium ${className}`}>
      {prefix}{resolvedText}
    </Badge>
  );
};
