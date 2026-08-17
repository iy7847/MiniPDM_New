import { Badge } from './Badge';

export type MESStatus = 'WAIT' | 'IN_PROGRESS' | 'DONE' | 'REWORK' | 'OUTSOURCED' | 'ERROR';

interface MESStatusBadgeProps {
  status: MESStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  WAIT: { label: '대기', variant: 'default' },
  IN_PROGRESS: { label: '진행중', variant: 'warning' },
  DONE: { label: '완료', variant: 'success' },
  REWORK: { label: '재작업', variant: 'danger' },
  OUTSOURCED: { label: '외주대기', variant: 'warning' },
  ERROR: { label: '불량', variant: 'danger' },
};

/**
 * DB의 MES 상태값을 받아서 적절한 색상과 한글 라벨을 가진 Badge로 렌더링하는 컴포넌트
 */
export function MESStatusBadge({ status, className }: MESStatusBadgeProps) {
  const config = statusConfig[status.toUpperCase()] || { label: status, variant: 'default' };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
