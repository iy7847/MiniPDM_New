import React, { useState, useEffect, useCallback } from 'react';
import { useBarcodeScanner } from '../shared/hooks/useBarcodeScanner';
import { ProductionScanModal } from '../features/production/components/ProductionScanModal';
import { ReceivingScanModal } from '../features/receiving/components/ReceivingScanModal';
import { useScannerStore } from '../shared/store/scannerStore';
import { supabase } from '../shared/services/supabase';

export const GlobalScanner: React.FC = () => {
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [routeType, setRouteType] = useState<'PRODUCTION' | 'RECEIVING' | 'UNKNOWN' | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const manualBarcode = useScannerStore(state => state.manualBarcode);
  const setManualBarcode = useScannerStore(state => state.setManualBarcode);

  const processBarcode = useCallback(async (barcode: string) => {
    setScannedBarcode(barcode);
    const prefix = barcode.charAt(0).toUpperCase();

    if (prefix === 'M') {
      setRouteType('RECEIVING');
      return;
    }

    if (prefix === 'P') {
      setIsChecking(true);
      try {
        const { data: item } = await supabase
          .from('order_items')
          .select('id, production_type, supply_type')
          .eq('order_item_no', barcode)
          .maybeSingle();

        if (!item) {
           setRouteType('UNKNOWN');
           return;
        }

        // 1. 기성품 구매(볼트/너트 등)는 조달 입고 처리로 이동
        if (item.supply_type === 'PURCHASE') {
          setRouteType('RECEIVING');
          return;
        }

        // 2. 외주 발주(outsource_orders) 확인: 미입고 상태의 외주 건이 있는가?
        const { data: outOrders } = await supabase
          .from('outsource_orders')
          .select('id, status')
          .eq('order_item_id', item.id)
          .order('created_at', { ascending: false });

        const hasPendingOutsource = outOrders && outOrders.length > 0 && outOrders.some(o => o.status !== '입고완료' && o.status !== '발주취소');

        // 3. 중간 공정 외주가공중인 로그가 있는가?
        const { data: logs } = await supabase
          .from('process_logs')
          .select('status')
          .eq('order_item_id', item.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        const isIntermediateOutsource = logs && logs.length > 0 && logs[0].status === '외주가공중';

        // 아직 입고되지 않은 외주 건(완제품 외주 or 중간 외주)이 있다면 무조건 입고 화면으로 라우팅!
        if (hasPendingOutsource || isIntermediateOutsource) {
          setRouteType('RECEIVING');
          return;
        }

        // 외주가 이미 입고 완료되었거나 사내 가공품인 경우: 다음 작업자를 위한 공정 관리 & 공정 설계 화면으로 라우팅!
        setRouteType('PRODUCTION');
      } catch (err) {
        console.error('Error checking barcode routing:', err);
        setRouteType('UNKNOWN');
      } finally {
        setIsChecking(false);
      }
      return;
    }

    setRouteType('UNKNOWN');
  }, []);

  useEffect(() => {
    if (manualBarcode) {
      processBarcode(manualBarcode);
    }
  }, [manualBarcode, processBarcode]);

  const handleScan = useCallback((barcode: string) => {
    processBarcode(barcode);
  }, [processBarcode]);

  useBarcodeScanner({
    onScan: handleScan,
    debounceTime: 30
  });

  const handleClose = () => {
    setScannedBarcode(null);
    setRouteType(null);
    setManualBarcode(null);
  };

  if (!scannedBarcode) return null;

  if (isChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (routeType === 'PRODUCTION') {
    return <ProductionScanModal barcode={scannedBarcode} onClose={handleClose} />;
  }
  
  if (routeType === 'RECEIVING') {
    return (
      <ReceivingScanModal 
        barcode={scannedBarcode} 
        onClose={handleClose} 
        onSwitchToProduction={() => setRouteType('PRODUCTION')} 
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-elevated p-8 rounded-lg border border-border-strong shadow-2xl max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4 text-warning">알 수 없는 바코드</h2>
        <p className="text-text-secondary text-lg mb-6">스캔된 바코드: <strong className="text-white">{scannedBarcode}</strong></p>
        <button 
          onClick={handleClose}
          className="w-full py-3 bg-bg-surface hover:bg-bg-overlay border border-border-default rounded-md text-white font-medium"
        >
          닫기
        </button>
      </div>
    </div>
  );
};
