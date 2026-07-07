import React, { useState } from 'react';
import { Card } from '@/design-system/Card';
import type { ExcelExportPreset } from '../services/settingsService';
import { TableProperties, Pin, GripVertical, X, Plus, ChevronRight } from 'lucide-react';

export const EXCEL_AVAILABLE_COLUMNS = [
  { id: 'part_no', label: '품번 (Drawing No)' },
  { id: 'part_name', label: '품명 (Part Name)' },
  { id: 'spec_w', label: '규격-가로/지름' },
  { id: 'spec_d', label: '규격-세로/길이' },
  { id: 'spec_h', label: '규격-두께' },
  { id: 'material_name', label: '원자재명' },
  { id: 'qty', label: '수량' },
  { id: 'unit_price', label: '단가' },
  { id: 'supply_price', label: '공급가액' },
  { id: 'process_time', label: '가공시간' },
  { id: 'work_days', label: '제작소요일' },
  { id: 'note', label: '비고' }
];

interface ExcelPresetTabProps {
  presets: ExcelExportPreset[];
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  onUpdateColumns: (id: string, columns: string[]) => void;
}

export const ExcelPresetTab: React.FC<ExcelPresetTabProps> = ({ presets, onAdd, onDelete, onUpdateColumns }) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newPresetName.trim()) return;
    onAdd(newPresetName);
    setNewPresetName('');
  };

  const addColumnToPreset = (preset: ExcelExportPreset, columnId: string) => {
    if (preset.columns.includes(columnId)) return;
    onUpdateColumns(preset.id, [...preset.columns, columnId]);
  };

  const removeColumnFromPreset = (preset: ExcelExportPreset, columnId: string) => {
    onUpdateColumns(preset.id, preset.columns.filter(c => c !== columnId));
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, preset: ExcelExportPreset, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    const newColumns = [...preset.columns];
    const [movedItem] = newColumns.splice(draggedItemIndex, 1);
    newColumns.splice(dropIndex, 0, movedItem);

    onUpdateColumns(preset.id, newColumns);
    setDraggedItemIndex(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-bg rounded-xl">
              <TableProperties className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-black text-text-primary uppercase tracking-tight">엑셀 내보내기 프리셋</h3>
              <p className="text-[10px] font-bold text-text-muted mt-0.5">데이터 내보내기 양식을 관리합니다.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              className="border border-border-default px-4 py-2 rounded-xl text-xs font-bold outline-none focus:border-brand-500 bg-bg-elevated text-text-primary w-40 transition-colors"
              placeholder="새 양식 이름"
              value={newPresetName}
              onChange={e => setNewPresetName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              className="bg-brand-500 text-white px-5 py-2 rounded-xl text-xs font-black shadow-inner hover:bg-brand-600 transition-all flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> 추가
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {presets.length === 0 && (
            <div className="text-center py-20 bg-bg-elevated rounded-2xl border-2 border-dashed border-border-default text-text-muted font-bold">
              등록된 엑셀 양식이 없습니다. 우측 상단에서 새로 추가해보세요.
            </div>
          )}
          
          {presets.map(preset => (
            <div key={preset.id} className="group relative bg-bg-elevated border border-border-default rounded-2xl p-6 shadow-smooth transition-all hover:border-brand-500/50">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Pin className="w-5 h-5 text-text-muted group-hover:text-brand-500 transition-colors" />
                  <h4 className="font-black text-xl text-text-primary tracking-tight">{preset.name}</h4>
                  <span className="px-2 py-0.5 bg-brand-bg text-brand-500 text-[10px] font-black rounded-lg border border-brand-500/20">{preset.columns?.length || 0} columns</span>
                </div>
                <button
                  onClick={() => window.confirm('삭제하시겠습니까?') && onDelete(preset.id)}
                  className="p-2 text-text-muted hover:text-danger hover:bg-danger-bg rounded-xl transition-all"
                  title="프리셋 삭제"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr,40px,1fr] gap-4">
                {/* Available Columns */}
                <div className="flex flex-col bg-bg-surface rounded-2xl border border-border-default overflow-hidden h-[350px]">
                  <div className="bg-bg-overlay p-3 text-[10px] font-black text-text-muted uppercase tracking-widest text-center border-b border-border-default">Available Items</div>
                  <div className="p-3 space-y-2 overflow-y-auto flex-1">
                    {EXCEL_AVAILABLE_COLUMNS.filter(col => !(preset.columns || []).includes(col.id)).map(col => (
                      <button
                        key={col.id}
                        onClick={() => addColumnToPreset(preset, col.id)}
                        className="w-full text-left px-4 py-2.5 bg-bg-elevated rounded-xl text-xs font-bold text-text-secondary border border-border-default shadow-sm hover:border-brand-500 hover:bg-brand-bg hover:text-brand-500 transition-all flex items-center justify-between group/add"
                      >
                        <span>{col.label}</span>
                        <Plus className="w-4 h-4 opacity-30 group-hover/add:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center hidden md:flex text-text-muted opacity-30">
                  <ChevronRight className="w-8 h-8" />
                </div>

                {/* Selected Columns */}
                <div className="flex flex-col bg-brand-bg rounded-2xl border border-brand-500 overflow-hidden h-[350px]">
                  <div className="bg-brand-500/10 p-3 text-[10px] font-black text-brand-400 uppercase tracking-widest text-center border-b border-brand-500/20">Selected Items (Drag to Sort)</div>
                  <div className="p-3 space-y-2 overflow-y-auto flex-1">
                    {(preset.columns || []).map((colId, index) => {
                      const colDef = EXCEL_AVAILABLE_COLUMNS.find(c => c.id === colId);
                      return (
                        <div
                          key={colId}
                          draggable
                          onDragStart={(e) => onDragStart(e, index)}
                          onDragOver={onDragOver}
                          onDrop={(e) => onDrop(e, preset, index)}
                          className="flex items-center justify-between px-4 py-2.5 bg-bg-elevated rounded-xl text-xs font-black text-text-primary border border-border-strong shadow-soft cursor-move hover:ring-2 hover:ring-brand-500 transition-all group/item"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-text-muted group-hover/item:text-brand-400" />
                            {colDef?.label || colId}
                          </div>
                          <button onClick={() => removeColumnFromPreset(preset, colId)} className="text-text-muted hover:text-danger p-1 rounded-md transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
