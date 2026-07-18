import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '../../../design-system/Button';
import { ExportExcelModal } from './ExportExcelModal';
import { exportDataToExcel } from './excelExport';
import { settingsService } from '../../../features/settings/services/settingsService';
import type { ExcelExportPreset } from '../../../features/settings/services/settingsService';

interface ExcelExportButtonProps {
  data: any[]; // The data to export
  companyId: string;
  fileName?: string;
  defaultColumns?: string[]; // Columns to use if no presets exist
  disabled?: boolean;
}

export const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  data,
  companyId,
  fileName = '엑셀다운로드',
  defaultColumns = ['part_no', 'part_name', 'qty', 'unit_price', 'supply_price', 'note'],
  disabled = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presets, setPresets] = useState<ExcelExportPreset[]>([]);

  const handleExportClick = async () => {
    try {
      // 1. Fetch presets from DB
      const fetchedPresets = await settingsService.fetchExcelPresets(companyId);
      
      if (fetchedPresets.length === 0) {
        // 2. If no presets, export with default columns directly
        exportDataToExcel(data, defaultColumns, fileName);
      } else {
        // 3. If presets exist, open modal to let user choose
        setPresets(fetchedPresets);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch excel presets:', error);
      // Fallback: Export directly if error
      exportDataToExcel(data, defaultColumns, fileName);
    }
  };

  const handleConfirmExport = (preset: ExcelExportPreset) => {
    // preset.columns is already an array of strings in the DB
    exportDataToExcel(data, preset.columns, fileName);
  };

  return (
    <>
      <Button 
        variant="secondary" 
        className="flex items-center gap-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500 transition-all"
        onClick={handleExportClick}
        disabled={disabled || data.length === 0}
      >
        <FileSpreadsheet size={16} />
        엑셀 다운로드
      </Button>

      <ExportExcelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        presets={presets}
        onConfirm={handleConfirmExport}
      />
    </>
  );
};
