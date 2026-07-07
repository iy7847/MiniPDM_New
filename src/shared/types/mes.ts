export type MaterialStatus = '발주대기' | '발주완료' | '입고대기' | '입고완료';

export interface MaterialOrder {
  id: string;
  orderItemId: string; // 연결된 수주 품목 ID
  materialName: string; // 소재명 (예: AL6061, S45C)
  spec: string; // 규격
  quantity: number; // 수량
  weight: number; // 총 중량 (kg)
  unitPrice: number; // kg당 단가
  totalPrice: number; // 총 금액
  supplierId?: string; // 매입처 ID
  supplierName?: string; // 매입처명
  orderDate?: string; // 발주일
  expectedDate?: string; // 입고예정일
  receivedDate?: string; // 실제입고일
  status: MaterialStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: string;
  materialName: string;
  spec: string;
  quantity: number;
  weight: number;
  location: string; // 보관 위치
  updatedAt: string;
}

export type ProcessType = '사내' | '외주';

export type ProcessStatus = '대기' | '진행중' | '완료' | '보류';

export type OutsourceStatus = '발주대기' | '발주완료' | '진행중' | '입고대기' | '완료';

export interface ProcessLog {
  id: string;
  orderItemId: string; // 수주 품목 ID
  processName: string; // 공정명 (예: 밀링, 선반, MCT, 표면처리)
  processType: ProcessType;
  status: ProcessStatus;
  worker?: string; // 작업자 (사내)
  machine?: string; // 설비명 (사내)
  outsourceId?: string; // 외주발주 ID (외주 공정일 경우)
  startTime?: string; // 시작 시간
  endTime?: string; // 종료 시간
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutsourceOrder {
  id: string;
  orderItemId: string; // 연결된 수주 품목 ID
  processId?: string; // 관련 공정 로그 ID
  supplierId: string; // 외주처 ID
  supplierName: string; // 외주처명
  processName: string; // 외주 공정명 (예: 아노다이징, 열처리)
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderDate?: string; // 발주일
  expectedDate?: string; // 완료예정일
  receivedDate?: string; // 실제완료일
  status: OutsourceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
