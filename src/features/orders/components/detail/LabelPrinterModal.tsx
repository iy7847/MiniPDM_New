import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../../../../shared/services/supabase';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import { Button, Card, BaseInput } from '../../../../design-system';
import { X, Printer, CheckSquare, Square, Settings2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { toast } from '../../../../shared/stores/useToastStore';
import type { Order, OrderItem } from '../../types';

interface LabelPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  items: OrderItem[];
  selectedItems?: string[];
}

const AVAILABLE_FIELDS = [
  { id: 'part_name', label: '품명' },
  { id: 'part_no', label: '도면 번호' },
  { id: 'spec', label: '규격' },
  { id: 'material_qty', label: '재질 + 수량' },
  { id: 'post_processing_name', label: '후처리' },
  { id: 'heat_treatment_name', label: '열처리' },
  { id: 'client_po_no', label: '고객사 PO' },
  { id: 'note', label: '비고' }
] as const;

export const LabelPrinterModal: React.FC<LabelPrinterModalProps> = ({ 
  isOpen, 
  onClose, 
  order, 
  items,
  selectedItems = []
}) => {
  const [labelWidth, setLabelWidth] = useState(55);
  const [labelHeight, setLabelHeight] = useState(35);
  const [selectedFields, setSelectedFields] = useState<string[]>(['part_name', 'part_no', 'material_qty']);
  
  const printRef = useRef(null);

  // Filter items to print
  const itemsToPrint = selectedItems.length > 0 
    ? items.filter(item => selectedItems.includes(item.id))
    : items;

  useEffect(() => {
    if (isOpen) {
      // Load saved fields from localStorage
      try {
        const savedFields = localStorage.getItem('minipdm_label_fields');
        if (savedFields) {
          let parsed = JSON.parse(savedFields);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Migrate old 'material_name' or 'qty' to 'material_qty'
            if (parsed.includes('material_name') || parsed.includes('qty')) {
              parsed = parsed.filter((id: string) => id !== 'material_name' && id !== 'qty');
              if (!parsed.includes('material_qty')) {
                parsed.push('material_qty');
              }
            }
            setSelectedFields(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load label fields', e);
      }

      // Load company label settings
      const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
          if (profile?.company_id) {
            const { data: company } = await supabase.from('companies').select('label_printer_width, label_printer_height').eq('id', profile.company_id).single();
            if (company) {
              setLabelWidth(company.label_printer_width || 55);
              setLabelHeight(company.label_printer_height || 35);
            }
          }
        }
      };
      fetchSettings();
    }
  }, [isOpen]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Labels_${order?.po_no}`,
  });

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      let newFields = [...prev];
      if (newFields.includes(fieldId)) {
        newFields = newFields.filter(id => id !== fieldId);
      } else {
        if (newFields.length >= 6) {
          toast.error('최대 6개까지만 선택 가능합니다.');
          return prev;
        }
        newFields.push(fieldId);
      }
      
      // Save to localStorage
      localStorage.setItem('minipdm_label_fields', JSON.stringify(newFields));
      return newFields;
    });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(selectedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSelectedFields(items);
    localStorage.setItem('minipdm_label_fields', JSON.stringify(items));
  };

  const getFieldValue = (item: OrderItem, fieldId: string) => {
    if (fieldId === 'material_qty') {
      let code = '';
      if (item.materials?.code) {
        code = item.materials.code;
      } else {
        const name = item.material_name || '';
        const match = name.match(/\(([^)]+)\)/);
        code = match ? match[1].trim() : name.trim();
      }
      const qtyStr = `수량: ${item.qty}EA`;
      if (code) return `${code} / ${qtyStr}`;
      return qtyStr;
    }
    if (fieldId === 'post_processing_name') {
      return item.post_processing_name || (item.estimate_items as any)?.post_processings?.name || (item as any).post_processing || '';
    }
    if (fieldId === 'heat_treatment_name') {
      return (item as any).heat_treatment_name || (item.estimate_items as any)?.heat_treatments?.name || '';
    }
    return (item as any)[fieldId] || '';
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-bg-base border-border-default shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-border-default">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Printer size={20} className="text-emerald-500" />
            라벨 출력
            <span className="text-sm font-normal text-text-secondary ml-2">
              (선택된 품목: {itemsToPrint.length}개)
            </span>
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-full transition-colors">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Panel: Settings */}
          <div className="w-full md:w-64 border-r border-border-default bg-bg-surface flex flex-col p-4 shrink-0 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 size={16} className="text-text-secondary" />
              <h4 className="font-bold text-text-primary text-sm">표시 항목 설정 (최대 6개)</h4>
            </div>
            
            <div className="flex flex-col gap-6 mb-6">
              <div>
                <h5 className="text-xs font-bold text-text-secondary mb-2">선택된 항목 (드래그하여 순서 변경)</h5>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="selected-fields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-2">
                        {selectedFields.map((fieldId, index) => {
                          const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
                          if (!field) return null;
                          return (
                            <Draggable key={fieldId} draggableId={fieldId} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="flex items-center gap-2 p-2 rounded border border-emerald-500 bg-emerald-500/10"
                                >
                                  <div {...provided.dragHandleProps} className="text-emerald-500/50 hover:text-emerald-500 cursor-grab active:cursor-grabbing">
                                    <GripVertical size={16} />
                                  </div>
                                  <span className="text-sm font-medium text-emerald-600 flex-1">{field.label}</span>
                                  <button onClick={() => toggleField(fieldId)} className="text-emerald-500 hover:text-red-500 transition-colors">
                                    <X size={16} />
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
                {selectedFields.length === 0 && (
                  <div className="text-xs text-text-secondary italic">선택된 항목이 없습니다.</div>
                )}
              </div>

              <div>
                <h5 className="text-xs font-bold text-text-secondary mb-2">추가할 항목</h5>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_FIELDS.filter(f => !selectedFields.includes(f.id)).map(field => (
                    <button
                      key={field.id}
                      onClick={() => toggleField(field.id)}
                      disabled={selectedFields.length >= 6}
                      className="px-3 py-1.5 rounded border border-border-default bg-bg-base text-sm text-text-primary hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + {field.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto border-t border-border-default pt-4">
              <h4 className="font-bold text-text-primary text-sm mb-3">용지 크기 (mm)</h4>
              <div className="flex gap-2 items-center">
                <BaseInput
                  type="number"
                  value={labelWidth}
                  onChange={(e) => setLabelWidth(Number(e.target.value))}
                  className="w-full text-center h-8"
                />
                <span className="text-text-secondary">x</span>
                <BaseInput
                  type="number"
                  value={labelHeight}
                  onChange={(e) => setLabelHeight(Number(e.target.value))}
                  className="w-full text-center h-8"
                />
              </div>
              
              {(() => {
                const minHeight = 17 + (Math.max(0, selectedFields.length - 1) * 3);
                const isTooSmall = labelHeight < minHeight;
                return (
                  <div className={`mt-2 text-xs ${isTooSmall ? 'text-red-400 font-bold' : 'text-text-secondary'}`}>
                    {isTooSmall ? `⚠️ 세로 크기가 너무 작습니다.` : `권장 최소 세로:`} <span className="font-mono">{minHeight}mm</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Panel: Preview */}
          <div className="flex-1 bg-bg-elevated p-6 overflow-auto flex flex-col">
            <h4 className="text-sm font-bold text-text-secondary mb-4 flex items-center justify-between">
              <span>미리보기</span>
              <span className="text-xs font-normal">
                설정 용지 크기: {labelWidth}x{labelHeight}mm
              </span>
            </h4>
            
            <div className="flex-1 flex flex-wrap content-start justify-center gap-4">
              <div
                ref={printRef}
                className="bg-white print:m-0 flex flex-col gap-1 items-start"
                style={{ width: `${labelWidth}mm`, minHeight: '100px' }}
              >
                {itemsToPrint.map((item, idx) => {
                  const barcodeValue = item.order_item_no || 'NO-BARCODE';
                  
                  return (
                    <div key={idx}
                      style={{
                        width: `${labelWidth}mm`,
                        height: `${labelHeight}mm`,
                        pageBreakAfter: 'always',
                        breakInside: 'avoid',
                        overflow: 'hidden'
                      }}
                      className="border border-gray-300 bg-white relative box-border flex flex-col"
                    >
                      <div className="w-full h-full flex flex-col relative px-[2mm] py-[1.5mm]">
                        
                        {/* Selected Text Fields Stack */}
                        <div className="flex-1 flex flex-col w-full overflow-hidden gap-[0.5mm]">
                          {selectedFields.map((fieldId, fieldIdx) => {
                            const val = getFieldValue(item, fieldId);
                            if (!val) return null;
                            
                            // Make the first field (usually part_name) slightly larger and bolder
                            const isFirst = fieldIdx === 0;
                            const fontSize = isFirst ? Math.max(10, labelWidth / 6) : Math.max(8, labelWidth / 8);
                            
                            return (
                              <div 
                                key={fieldId} 
                                className={`w-full truncate ${isFirst ? 'font-bold text-gray-800' : 'font-semibold text-gray-700'}`}
                                style={{ fontSize: `${fontSize}px`, lineHeight: '1.2' }}
                              >
                                {val}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Bottom Barcode (Always shown) */}
                        <div className="w-full mt-auto flex flex-col items-center justify-end shrink-0 pt-[1mm]">
                          <div className="w-full flex justify-center overflow-hidden">
                            <Barcode 
                              value={barcodeValue} 
                              width={1.2} 
                              height={25} 
                              fontSize={10} 
                              margin={0}
                              displayValue={true}
                              background="transparent"
                            />
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {itemsToPrint.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-text-secondary">
                출력할 품목이 선택되지 않았습니다. 테이블에서 체크박스를 선택해주세요.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border-default bg-bg-surface flex justify-end gap-2 rounded-b-xl shrink-0">
          <Button variant="outline" onClick={onClose}>닫기</Button>
          <Button 
            variant="primary" 
            onClick={() => handlePrint()} 
            className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-[0_0_10px_rgba(5,150,105,0.3)] hover:shadow-[0_0_15px_rgba(5,150,105,0.5)] transition-all"
            disabled={itemsToPrint.length === 0}
          >
            <Printer size={16} /> 인쇄 시작
          </Button>
        </div>
      </Card>
    </div>
  );
};
