

export interface PriceHistoryRecord {
  id: string;
  clientId: string;
  partId: string;
  partName: string;
  previousPrice: number;
  newPrice: number;
  changeDate: string;
  reason: string;
}

class PriceHistoryService {
  /**
   * 거래처별 단가 변동 이력 가져오기 (Mock)
   * @param clientId 거래처 ID
   */
  async getPriceHistoryByClient(clientId: string): Promise<PriceHistoryRecord[]> {
    // 실제 구현 시 supabase에서 조회
    return [
      {
        id: 'ph1',
        clientId,
        partId: 'p101',
        partName: '하우징 커버 A',
        previousPrice: 12500,
        newPrice: 13200,
        changeDate: '2026-06-15T10:00:00Z',
        reason: '원자재 가격 상승',
      },
      {
        id: 'ph2',
        clientId,
        partId: 'p105',
        partName: '샤프트 브라켓',
        previousPrice: 8500,
        newPrice: 8200,
        changeDate: '2026-05-20T14:30:00Z',
        reason: '공정 개선으로 인한 원가 절감',
      },
      {
        id: 'ph3',
        clientId,
        partId: 'p110',
        partName: '모터 마운트',
        previousPrice: 24000,
        newPrice: 25500,
        changeDate: '2026-04-10T09:15:00Z',
        reason: '열처리 공정 추가',
      }
    ];
  }

  /**
   * 특정 부품의 단가 이력 가져오기 (Mock)
   * @param partId 부품 ID
   */
  async getPriceHistoryByPart(partId: string): Promise<PriceHistoryRecord[]> {
    return [
      {
        id: 'ph4',
        clientId: 'c1',
        partId,
        partName: '특수 브라켓',
        previousPrice: 15000,
        newPrice: 16500,
        changeDate: '2026-06-01T11:00:00Z',
        reason: '소재 변경(AL6061 -> AL7075)',
      }
    ];
  }
}

export const priceHistoryService = new PriceHistoryService();
