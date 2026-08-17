import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileSpreadsheet } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import type { ExcelExportPreset } from '../../../features/settings/services/settingsService';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: ExcelExportPreset[];
  onConfirm: (preset: ExcelExportPreset) => void;
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({ 
  isOpen, 
  onClose, 
  presets, 
  onConfirm 
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  useEffect(() => {
    if (isOpen && presets.length > 0 && !selectedPresetId) {
      setSelectedPresetId(presets[0].id);
    }
  }, [isOpen, presets]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-surface w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-border-default animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-emerald-500/20 bg-bg-elevated/50">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-500" size={20} />
            엑셀 다운로드 양식 선택
          </h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full hover:bg-bg-overlay"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-text-secondary mb-4">
            어떤 양식으로 엑셀을 다운로드 하시겠습니까?
          </p>
          
          <div className="space-y-2">
            {presets.map(preset => (
              <label 
                key={preset.id} 
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPresetId === preset.id 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-border-default hover:border-emerald-500/50 bg-bg-base'
                }`}
              >
                <input 
                  type="radio" 
                  name="excel_preset" 
                  value={preset.id}
                  checked={selectedPresetId === preset.id}
                  onChange={() => setSelectedPresetId(preset.id)}
                  className="w-4 h-4 text-emerald-500 bg-bg-elevated border-border-default focus:ring-emerald-500 focus:ring-2"
                />
                <span className="ml-3 text-sm font-medium text-text-primary">
                  {preset.name}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              취소
            </Button>
            <Button 
              variant="primary" 
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-[0_0_10px_rgba(5,150,105,0.3)] hover:shadow-[0_0_15px_rgba(5,150,105,0.5)] transition-all"
              disabled={!selectedPresetId}
              onClick={() => {
                const selected = presets.find(p => p.id === selectedPresetId);
                if (selected) {
                  onConfirm(selected);
                  onClose();
                }
              }}
            >
              다운로드
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
