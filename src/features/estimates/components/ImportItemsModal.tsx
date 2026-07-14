import React, { useState } from 'react';
import { X, Copy, RefreshCw, UploadCloud } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import type { EstimateItem } from '../types';

interface ImportedItem {
  part_name: string;
  part_no?: string;
  spec?: string;
  qty: number;
  unit_price: number;
  original_material_name?: string;
  material_text?: string;
  post_process_text?: string;
  heat_treatment_text?: string;
}

interface ImportItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (items: Partial<EstimateItem>[]) => void;
  initialRawRows?: string[][];
}

export function ImportItemsModal({ isOpen, onClose, onConfirm, initialRawRows }: ImportItemsModalProps) {
  const [previewItems, setPreviewItems] = useState<ImportedItem[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});

  React.useEffect(() => {
    if (isOpen && initialRawRows && initialRawRows.length > 0) {
      setRawRows(initialRawRows);
      applyHeuristicMapping(initialRawRows[0], initialRawRows);
    } else if (!isOpen) {
      setRawRows([]);
      setPreviewItems([]);
      setColumnMapping({});
    }
  }, [isOpen, initialRawRows]);

  if (!isOpen) return null;

  const applyHeuristicMapping = (firstRow: string[], allRows: string[][]) => {
    const newMapping: Record<number, string> = {};
    if (firstRow.length >= 2) {
      newMapping[0] = 'part_name';
      const lastIdx = firstRow.length - 1;
      newMapping[lastIdx] = 'unit_price';
      if (firstRow.length >= 3) newMapping[lastIdx - 1] = 'qty';
      if (firstRow.length >= 4) newMapping[1] = 'spec';
    }
    setColumnMapping(newMapping);
    updatePreview(allRows, newMapping);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');

    setRawRows([]);
    setPreviewItems([]);
    setColumnMapping({});

    if (htmlData && htmlData.includes('<table')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tr'));
      const rows = trs.map(tr =>
        Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent?.trim() || '')
      );
      const cleanRows = rows.filter(r => r.some(c => c.trim().length > 0));

      if (cleanRows.length > 0) {
        setRawRows(cleanRows);
        const newMapping: Record<number, string> = {};
        const header = cleanRows[0].map(c => c.toLowerCase());

        header.forEach((text, idx) => {
          if (text.includes('part') || text.includes('품명') || text.includes('number')) newMapping[idx] = 'part_name';
          if (text.includes('spec') || text.includes('규격') || text.includes('desc')) newMapping[idx] = 'spec';
          if (text.includes('drawing') || text.includes('dwg') || text.includes('도번') || text.includes('품번')) newMapping[idx] = 'part_no';
          if (text.includes('qty') || text.includes('수량') || text.includes('quantity')) newMapping[idx] = 'qty';
          if (text.includes('price') || text.includes('단가') || text.includes('unit')) newMapping[idx] = 'unit_price';
          if (text.includes('mat') || text.includes('재질')) newMapping[idx] = 'original_material_name';
        });

        setColumnMapping(newMapping);
        updatePreview(cleanRows, newMapping);
      }
      return;
    }

    if (textData) {
      const lines = textData.split(/\r?\n/).filter(l => l.trim().length > 0);
      const rows = lines.map(line => line.split('\t').map(c => c.trim()));

      if (rows.length > 0) {
        setRawRows(rows);
        applyHeuristicMapping(rows[0], rows);
      }
    }
  };

  const handleColumnMappingChange = (colIndex: number, field: string) => {
    const newMapping = { ...columnMapping, [colIndex]: field };
    if (!field) delete newMapping[colIndex];
    setColumnMapping(newMapping);
    updatePreview(rawRows, newMapping);
  };

  const updatePreview = (rows: string[][], mapping: Record<number, string>) => {
    const partNameIndex = Object.keys(mapping).find(k => mapping[parseInt(k)] === 'part_name');
    if (!partNameIndex) {
      setPreviewItems([]);
      return;
    }
    const items = rows.map(row => {
      const raw: Record<string, string | number> = {};
      Object.entries(mapping).forEach(([colIdx, field]) => {
        const val = row[parseInt(colIdx)];
        if (field === 'qty' || field === 'unit_price') {
          raw[field] = parseInt(val?.replace(/[^0-9]/g, '') || '0');
        } else {
          raw[field] = val;
        }
      });
      if (!raw['part_name']) return null;
      if (!raw['qty']) raw['qty'] = 1;
      if (!raw['unit_price']) raw['unit_price'] = 0;
      return raw as unknown as ImportedItem;
    }).filter((x): x is ImportedItem => x !== null);
    setPreviewItems(items);
  };

  const handleConfirm = () => {
    const convertedItems: Partial<EstimateItem>[] = previewItems.map(item => ({
      part_name: item.part_name,
      part_no: item.part_no,
      qty: item.qty,
      unit_price: item.unit_price,
      supply_price: item.qty * item.unit_price,
      original_material_name: item.original_material_name || item.material_text || item.spec,
      note: [item.spec, item.post_process_text, item.heat_treatment_text].filter(Boolean).join(' / ')
    }));

    onConfirm(convertedItems);
    onClose();
    setPreviewItems([]);
    setRawRows([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-surface shrink-0">
          <div className="flex items-center gap-2">
            <Copy className="text-brand-500" size={20} />
            <h3 className="text-lg font-bold text-text-primary">엑셀/표 붙여넣기</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col flex-1 p-4 gap-4 overflow-hidden bg-bg-base">
          {rawRows.length === 0 ? (
            <div className="flex-1 flex flex-col">
              <label className="text-sm font-bold text-text-secondary mb-2">
                엑셀이나 웹페이지 표를 복사(Ctrl+C)하여 붙여넣기(Ctrl+V) 하세요.
              </label>
              <div
                className="flex-1 border-2 border-dashed border-border-strong rounded-xl bg-bg-elevated flex flex-col items-center justify-center p-8 text-center cursor-text hover:border-brand-500 hover:bg-brand-500/5 transition-colors"
                tabIndex={0}
                onPaste={handlePaste}
              >
                <div className="pointer-events-none flex flex-col items-center">
                  <UploadCloud className="text-brand-500 mb-4" size={48} />
                  <p className="font-bold text-text-primary text-lg mb-2">여기를 클릭 후, Ctrl + V 를 누르세요</p>
                  <p className="text-sm text-text-secondary">텍스트 데이터를 자동으로 표 형태로 파싱합니다.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex justify-between items-center bg-brand-500/10 p-3 rounded-lg border border-brand-500/20 shrink-0">
                <div className="text-sm text-brand-500 font-bold">
                  💡 각 열(Column)의 헤더를 클릭하여 데이터를 지정해주세요.
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setRawRows([]); setPreviewItems([]); }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  초기화 / 다시 붙여넣기
                </Button>
              </div>

              {/* Raw Grid */}
              <div className="flex-1 overflow-auto border border-border-default rounded-lg relative bg-bg-surface custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="sticky top-0 bg-bg-elevated z-10 shadow-sm">
                    <tr>
                      <th className="p-2 w-12 border-b border-r border-border-default text-center font-bold text-text-secondary bg-bg-overlay">#</th>
                      {Array.from({ length: Math.max(...rawRows.map(r => r.length)) }).map((_, colIndex) => (
                        <th key={colIndex} className="p-1 min-w-[140px] border-b border-r border-border-default bg-bg-overlay">
                          <select
                            className={`w-full text-sm p-1.5 border rounded-md font-bold outline-none transition-colors ${
                              columnMapping[colIndex] 
                                ? 'bg-brand-500 text-white border-brand-500' 
                                : 'bg-bg-surface text-text-secondary border-border-strong hover:border-brand-500/50'
                            }`}
                            value={columnMapping[colIndex] || ''}
                            onChange={(e) => handleColumnMappingChange(colIndex, e.target.value)}
                          >
                            <option value="">(무시)</option>
                            <option value="part_name">품명 (Part Name) *</option>
                            <option value="part_no">도번/품번 (Part No)</option>
                            <option value="spec">규격 (Spec)</option>
                            <option value="qty">수량 (Qty)</option>
                            <option value="unit_price">단가 (Price)</option>
                            <option value="original_material_name">도면재질 (Material)</option>
                            <option value="material_text">실제재질 (Real Mat.)</option>
                            <option value="post_process_text">후처리 (Post Proc.)</option>
                            <option value="heat_treatment_text">열처리 (Heat Treat.)</option>
                          </select>
                        </th>
                      ))}
                      <th className="p-1 w-12 border-b border-border-default bg-bg-overlay text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={`hover:bg-bg-elevated transition-colors ${rowIndex < 1 ? 'bg-bg-overlay/50' : ''}`}>
                        <td className="p-2 border-b border-r border-border-default text-center text-text-secondary font-mono">{rowIndex + 1}</td>
                        {Array.from({ length: Math.max(...rawRows.map(r => r.length)) }).map((_, colIndex) => (
                          <td key={colIndex} className={`p-2 border-b border-r border-border-default truncate max-w-[200px] text-text-primary ${
                            columnMapping[colIndex] ? 'bg-brand-500/5' : ''
                          }`}>
                            {row[colIndex] || ''}
                          </td>
                        ))}
                        <td className="p-1 border-b border-border-default text-center">
                          <button
                            onClick={() => { const n = [...rawRows]; n.splice(rowIndex, 1); setRawRows(n); updatePreview(n, columnMapping); }}
                            className="text-text-tertiary hover:text-danger font-bold px-2 py-1 transition-colors"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview Panel */}
          <div className="h-48 flex flex-col border border-border-default rounded-lg bg-bg-surface overflow-hidden shrink-0 mt-2">
            <div className="bg-bg-overlay p-2.5 font-bold text-sm text-text-primary border-b border-border-default flex justify-between items-center">
              <span>최종 결과 ({previewItems.length}건)</span>
              {previewItems.length > 0 && <span className="text-xs text-brand-500">모든 품명(*)이 포함된 항목만 표시됩니다</span>}
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-bg-surface shadow-sm">
                  <tr className="border-b border-border-default text-text-secondary text-xs">
                    <th className="p-2 font-bold">No.</th>
                    <th className="p-2 font-bold">품명</th>
                    <th className="p-2 font-bold">품번/도번</th>
                    <th className="p-2 font-bold">규격</th>
                    <th className="p-2 font-bold">수량</th>
                    <th className="p-2 font-bold">단가</th>
                    <th className="p-2 font-bold">재질</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((item, i) => (
                    <tr key={i} className="border-b border-border-default hover:bg-bg-elevated transition-colors">
                      <td className="p-2 text-text-secondary">{i + 1}</td>
                      <td className="p-2 font-bold text-brand-400">{item.part_name}</td>
                      <td className="p-2 text-text-primary">{item.part_no || '-'}</td>
                      <td className="p-2 text-text-primary">{item.spec || '-'}</td>
                      <td className="p-2 text-text-primary">{item.qty}</td>
                      <td className="p-2 text-right text-text-primary">{item.unit_price.toLocaleString()}</td>
                      <td className="p-2 text-text-secondary truncate max-w-[150px]">
                        {[item.original_material_name, item.material_text].filter(Boolean).join('/') || '-'}
                      </td>
                    </tr>
                  ))}
                  {previewItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-secondary">
                        가져올 데이터가 없습니다. 열 매핑(품명 필수)을 확인해주세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border-default bg-bg-overlay flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="px-6 font-bold">
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={previewItems.length === 0}
            className="px-6 font-bold shadow-glow"
          >
            적용하기 ({previewItems.length}건)
          </Button>
        </div>
      </div>
    </div>
  );
}
