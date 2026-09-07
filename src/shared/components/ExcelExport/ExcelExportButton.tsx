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
  showForeign?: boolean;
  exchangeRate?: number;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  iconSize?: number;
  label?: React.ReactNode;
  estimate?: any;
}

export const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  data,
  companyId,
  fileName = '엑셀다운로드',
  defaultColumns = ['part_no', 'part_name', 'qty', 'unit_price', 'supply_price', 'note'],
  disabled = false,
  showForeign = false,
  exchangeRate = 1,
  className = "flex items-center gap-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500 transition-all",
  variant = "secondary",
  iconSize = 16,
  label = "엑셀 다운로드",
  estimate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presets, setPresets] = useState<ExcelExportPreset[]>([]);

  const getProcessedData = () => {
    if (!showForeign || exchangeRate <= 0) return data;
    return data.map(item => {
      const unitPriceForeign = (item.unit_price || 0) / exchangeRate;
      const supplyPriceForeign = (item.supply_price || 0) / exchangeRate;
      
      return {
        ...item,
        unit_price: Math.ceil(unitPriceForeign * 100) / 100,
        supply_price: Math.ceil(supplyPriceForeign * 100) / 100,
      };
    });
  };

  const handleExportClick = async () => {
    try {
      // 1. Fetch presets from DB
      const fetchedPresets = await settingsService.fetchExcelPresets(companyId);
      
      if (fetchedPresets.length === 0) {
        // 2. If no presets, export with default columns directly
        exportDataToExcel(getProcessedData(), defaultColumns, fileName, estimate);
      } else {
        // 3. If presets exist, add default preset to the list and open modal
        const allPresets = [
          { id: 'default', name: '기본 양식', columns: defaultColumns },
          ...fetchedPresets
        ];
        setPresets(allPresets);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch excel presets:', error);
      // Fallback: Export directly if error
      exportDataToExcel(getProcessedData(), defaultColumns, fileName, estimate);
    }
  };

  const handleConfirmExport = (preset: ExcelExportPreset) => {
    // preset.columns is already an array of strings in the DB
    exportDataToExcel(getProcessedData(), preset.columns, fileName, estimate);
  };

  return (
    <>
      <Button 
        variant={variant} 
        className={className}
        onClick={handleExportClick}
        disabled={disabled || data.length === 0}
      >
        <FileSpreadsheet size={iconSize} />
        {label}
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
