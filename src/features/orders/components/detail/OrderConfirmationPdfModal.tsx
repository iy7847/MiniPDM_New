import React, { useRef } from 'react';
import { X, Printer, Download, FileCheck } from 'lucide-react';
import { Button } from '../../../../design-system';
import type { Order, OrderItem } from '../../types';

interface OrderConfirmationPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  items: OrderItem[];
}

export const OrderConfirmationPdfModal: React.FC<OrderConfirmationPdfModalProps> = ({
  isOpen,
  onClose,
  order,
  items
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const isForeign = order.currency && order.currency !== 'KRW';
  const rate = isForeign ? (order.exchange_rate || 1) : 1;

  const totalAmount = items.reduce((sum, item) => {
    const qty = item.quantity || item.qty || 1;
    const price = isForeign ? ((item.unit_price || 0) / rate) : (item.unit_price || 0);
    return sum + (price * qty);
  }, 0);
  
  const vatAmount = isForeign ? totalAmount * 0.1 : Math.round(totalAmount * 0.1);
  const grandTotal = totalAmount + vatAmount;

  const formatMoney = (val: number) => isForeign 
    ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(val).toLocaleString();

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>수주확인서_${order.po_no || order.order_number}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; font-family: sans-serif; color: #000; }
              .no-print { display: none; }
            }
            body { font-family: 'Pretendard', sans-serif; margin: 0; padding: 20px; background: #fff; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f4f4f5; font-weight: bold; }
            .header-table td { border: none; padding: 4px 0; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4 overflow-y-auto">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-surface shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck className="text-brand-500" size={20} />
            <h3 className="text-lg font-bold text-text-primary">수주확인서 미리보기 (Order Confirmation)</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer size={16} /> 인쇄 / PDF 저장
            </Button>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PDF Preview Document Area */}
        <div className="flex-1 overflow-auto p-8 bg-neutral-900 flex justify-center">
          <div 
            ref={printRef}
            className="w-[210mm] min-h-[297mm] bg-white text-black p-10 shadow-2xl rounded-sm flex flex-col justify-between"
            style={{ color: '#111827' }}
          >
            <div>
              {/* Title Header */}
              <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h1 className="text-3xl font-black tracking-widest text-black mb-1">수 주 확 인 서</h1>
                <p className="text-xs text-gray-500 tracking-wider">ORDER CONFIRMATION</p>
              </div>

              {/* Order Meta Info */}
              <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
                <div className="border border-gray-300 p-4 rounded-sm space-y-2">
                  <h4 className="font-bold text-sm border-b pb-1 mb-2 text-black">수주(고객) 정보</h4>
                  <div><strong className="w-20 inline-block text-gray-600">고객사:</strong> {(order as any).clients?.name || '-'}</div>
                  <div><strong className="w-20 inline-block text-gray-600">PO 번호:</strong> {order.po_no || order.order_number}</div>
                  <div><strong className="w-20 inline-block text-gray-600">수주일자:</strong> {order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}</div>
                  <div><strong className="w-20 inline-block text-gray-600">납기일자:</strong> {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}</div>
                </div>

                <div className="border border-gray-300 p-4 rounded-sm space-y-2">
                  <h4 className="font-bold text-sm border-b pb-1 mb-2 text-black">공급자 정보</h4>
                  <div><strong className="w-20 inline-block text-gray-600">등록번호:</strong> 123-45-67890</div>
                  <div><strong className="w-20 inline-block text-gray-600">상호(법인):</strong> MiniPDM 가공 정밀</div>
                  <div><strong className="w-20 inline-block text-gray-600">대표자명:</strong> 박일용</div>
                  <div><strong className="w-20 inline-block text-gray-600">특이사항:</strong> {order.note || '없음'}</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-100 border-y border-black text-black">
                    <th className="p-2 text-center w-12 border border-gray-300">NO</th>
                    <th className="p-2 text-left border border-gray-300">품번 (Part No)</th>
                    <th className="p-2 text-left border border-gray-300">품명 (Part Name)</th>
                    <th className="p-2 text-left border border-gray-300">규격 (Spec)</th>
                    <th className="p-2 text-right w-16 border border-gray-300">수량</th>
                    <th className="p-2 text-right w-24 border border-gray-300">단가({order.currency || 'KRW'})</th>
                    <th className="p-2 text-right w-28 border border-gray-300">공급가액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const qty = item.quantity || item.qty || 1;
                    const originalPrice = item.unit_price || 0;
                    const price = isForeign ? (originalPrice / rate) : originalPrice;
                    const supply = price * qty;
                    return (
                      <tr key={item.id || idx} className="border-b border-gray-200">
                        <td className="p-2 text-center border border-gray-300">{idx + 1}</td>
                        <td className="p-2 font-mono border border-gray-300">{item.part_no || '-'}</td>
                        <td className="p-2 font-bold border border-gray-300">{item.part_name}</td>
                        <td className="p-2 text-gray-600 border border-gray-300">{item.spec || '-'}</td>
                        <td className="p-2 text-right border border-gray-300">{qty.toLocaleString()}</td>
                        <td className="p-2 text-right border border-gray-300">{formatMoney(price)}</td>
                        <td className="p-2 text-right font-medium border border-gray-300">{formatMoney(supply)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-72 border border-black p-3 bg-gray-50 text-xs space-y-1.5">
                  <div className="flex justify-between text-gray-700">
                    <span>공급가액 합계:</span>
                    <span>{formatMoney(totalAmount)} {order.currency || 'KRW'}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>부가가치세 (10%):</span>
                    <span>{formatMoney(vatAmount)} {order.currency || 'KRW'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t border-gray-400 pt-1 text-black">
                    <span>최종 수주 총액:</span>
                    <span className="text-blue-700">{formatMoney(grandTotal)} {order.currency || 'KRW'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Footer Note */}
            <div className="border-t border-gray-300 pt-4 text-[11px] text-gray-500 flex justify-between items-center">
              <div>* 본 수주확인서는 당사에 정식 발주 수용되었음을 증명하는 서류입니다.</div>
              <div>발행일시: {new Date().toLocaleDateString()}</div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
