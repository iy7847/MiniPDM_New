import React, { useState } from 'react';
import { X, Copy, RefreshCw, UploadCloud, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../../design-system/Button';

interface ClipboardMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatch: (matches: { part_no: string; po_no: string; qty: number; unit_price: number; due_date: string }[], currency: string) => void;
  defaultCurrency?: string;
}

export const ClipboardMatchModal: React.FC<ClipboardMatchModalProps> = ({ 
  isOpen, 
  onClose, 
  onMatch, 
  defaultCurrency = 'KRW' 
}) => {
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [poCol, setPoCol] = useState<number>(-1);
  const [partNoCol, setPartNoCol] = useState<number>(-1);
  const [qtyCol, setQtyCol] = useState<number>(-1);
  const [unitPriceCol, setUnitPriceCol] = useState<number>(-1);
  const [dueDateCol, setDueDateCol] = useState<number>(-1);
  const [currency, setCurrency] = useState(defaultCurrency);

  React.useEffect(() => {
    if (isOpen) {
      setCurrency(defaultCurrency);
    } else {
      handleReset();
    }
  }, [isOpen, defaultCurrency]);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const rows = pasted.trim().split('\n').map(row => row.split('\t'));
    setPreviewData(rows);

    // Auto-detect columns
    if (rows.length > 0) {
      const header = rows[0];
      let foundPo = -1, foundPart = -1, foundQty = -1, foundPrice = -1, foundDate = -1;
      header.forEach((col, idx) => {
        const lower = col.toLowerCase();
        if (lower.includes('po') || lower.includes('발주')) foundPo = idx;
        if (lower.includes('part') || lower.includes('도번')) foundPart = idx;
        if (lower.includes('qty') || lower.includes('수량')) foundQty = idx;
        if (lower.includes('price') || lower.includes('단가')) foundPrice = idx;
        if (lower.includes('date') || lower.includes('납기')) foundDate = idx;
      });
      setPoCol(foundPo);
      setPartNoCol(foundPart);
      setQtyCol(foundQty);
      setUnitPriceCol(foundPrice);
      setDueDateCol(foundDate);
    }
  };

  const handleReset = () => {
    setPreviewData([]);
    setPoCol(-1);
    setPartNoCol(-1);
    setQtyCol(-1);
    setUnitPriceCol(-1);
    setDueDateCol(-1);
  };

  const handleApply = () => {
    if (partNoCol === -1) {
      alert('도번(Part No) 열을 반드시 선택해주세요.');
      return;
    }

    const matches = previewData.map(row => ({
      part_no: partNoCol !== -1 ? row[partNoCol]?.trim() : '',
      po_no: poCol !== -1 ? row[poCol]?.trim() : '',
      qty: qtyCol !== -1 ? Number(row[qtyCol]?.trim() || 0) : 0,
      unit_price: unitPriceCol !== -1 ? Number(row[unitPriceCol]?.replace(/[^0-9.]/g, '') || 0) : 0,
      due_date: dueDateCol !== -1 ? row[dueDateCol]?.trim() : ''
    })).filter(m => m.part_no && m.po_no); 

    onMatch(matches, currency);
    onClose();
    handleReset();
  };

  if (!isOpen) return null;

  const handleColChange = (idx: number, val: string) => {
    if (val === 'po') setPoCol(idx);
    else if (val === 'part') setPartNoCol(idx);
    else if (val === 'qty') setQtyCol(idx);
    else if (val === 'price') setUnitPriceCol(idx);
    else if (val === 'date') setDueDateCol(idx);
    else {
      if (idx === poCol) setPoCol(-1);
      if (idx === partNoCol) setPartNoCol(-1);
      if (idx === qtyCol) setQtyCol(-1);
      if (idx === unitPriceCol) setUnitPriceCol(-1);
      if (idx === dueDateCol) setDueDateCol(-1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-surface shrink-0">
          <div className="flex items-center gap-2">
            <Copy className="text-brand-500" size={20} />
            <h3 className="text-lg font-bold text-text-primary">엑셀 발주 데이터 매칭</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col flex-1 p-4 gap-4 overflow-hidden bg-bg-base">
          {previewData.length === 0 ? (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                 <label className="text-sm font-bold text-text-secondary">
                   고객 발주서(엑셀)의 표 데이터를 복사(Ctrl+C)하여 붙여넣기(Ctrl+V) 하세요.
                 </label>
                 <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-text-secondary">통화 (Currency)</label>
                    <select
                      className="h-8 px-2 rounded border border-border-default text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-bg-surface text-text-primary font-medium"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="KRW">KRW (₩)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CNY">CNY (¥)</option>
                    </select>
                 </div>
              </div>
              <div
                className="flex-1 border-2 border-dashed border-border-strong rounded-xl bg-bg-elevated flex flex-col items-center justify-center p-8 text-center cursor-text hover:border-brand-500 hover:bg-brand-500/5 transition-colors focus:outline-none"
                tabIndex={0}
                onPaste={handlePaste}
              >
                <div className="pointer-events-none flex flex-col items-center">
                  <UploadCloud className="text-brand-500 mb-4" size={48} />
                  <p className="font-bold text-text-primary text-lg mb-2">여기를 클릭 후, Ctrl + V 를 누르세요</p>
                  <p className="text-sm text-text-secondary">기존 견적 데이터와 도번을 기준으로 자동으로 매칭합니다.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex justify-between items-center bg-brand-500/10 p-3 rounded-lg border border-brand-500/20 shrink-0">
                <div className="text-sm text-brand-500 font-bold">
                  💡 도번(Part No) 열(Column)을 반드시 지정해주세요.
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-brand-600">통화</label>
                    <select
                      className="h-7 px-2 py-0 rounded border border-brand-500/30 text-xs focus:outline-none focus:border-brand-500 bg-bg-surface text-brand-600 font-bold"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="KRW">KRW</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="JPY">JPY</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReset}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw size={14} />
                    초기화 / 다시 붙여넣기
                  </Button>
                </div>
              </div>

              {/* Raw Grid */}
              <div className="flex-1 overflow-auto border border-border-default rounded-lg relative bg-bg-surface custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-bg-elevated z-10 shadow-sm">
                    <tr>
                      <th className="p-2 w-12 border-b border-r border-border-default text-center font-bold text-text-secondary bg-bg-overlay">#</th>
                      {previewData[0].map((_, idx) => {
                        const isSelected = idx === poCol || idx === partNoCol || idx === qtyCol || idx === unitPriceCol || idx === dueDateCol;
                        const colValue = idx === poCol ? 'po' : idx === partNoCol ? 'part' : idx === qtyCol ? 'qty' : idx === unitPriceCol ? 'price' : idx === dueDateCol ? 'date' : '';
                        
                        return (
                          <th key={idx} className="p-1 min-w-[140px] border-b border-r border-border-default bg-bg-overlay">
                            <select
                              className={`w-full text-sm p-1.5 border rounded-md font-bold outline-none transition-colors ${
                                isSelected 
                                  ? 'bg-brand-500 text-white border-brand-500' 
                                  : 'bg-bg-surface text-text-secondary border-border-strong hover:border-brand-500/50'
                              }`}
                              value={colValue}
                              onChange={(e) => handleColChange(idx, e.target.value)}
                            >
                              <option value="">(무시)</option>
                              <option value="part">도번 (Part No) *</option>
                              <option value="po">PO 번호</option>
                              <option value="qty">수량 (Qty)</option>
                              <option value="price">단가 (Unit Price)</option>
                              <option value="date">납기일 (Due Date)</option>
                            </select>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rIdx) => (
                      <tr key={rIdx} className={`hover:bg-bg-elevated transition-colors ${rIdx < 1 ? 'bg-bg-overlay/50' : ''}`}>
                        <td className="p-2 border-b border-r border-border-default text-center text-text-secondary font-mono">{rIdx + 1}</td>
                        {row.map((cell, cIdx) => {
                           const isSelected = cIdx === poCol || cIdx === partNoCol || cIdx === qtyCol || cIdx === unitPriceCol || cIdx === dueDateCol;
                           return (
                             <td key={cIdx} className={`p-2 border-b border-r border-border-default truncate max-w-[200px] ${
                               isSelected ? (cIdx === partNoCol ? 'bg-brand-500/10 text-brand-500 font-bold' : 'bg-brand-500/5 text-text-primary') : 'text-text-secondary'
                             }`}>
                               {cell}
                             </td>
                           );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border-default bg-bg-overlay flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="px-6 font-bold">
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={previewData.length === 0 || partNoCol === -1}
            className="px-6 font-bold shadow-glow flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            적용하기 ({previewData.filter(r => r[partNoCol]?.trim()).length}건)
          </Button>
        </div>
      </div>
    </div>
  );
};

