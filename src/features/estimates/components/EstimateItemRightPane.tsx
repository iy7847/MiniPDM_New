import React from 'react';
import type { EstimateItem } from '../types';
import { DocumentViewer } from './DocumentViewer';
import { toast } from '../../../shared/stores/useToastStore';

interface EstimateItemRightPaneProps {
  itemForm: EstimateItem;
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
  isReadOnly?: boolean;
  companyInfo?: any;
}

export const EstimateItemRightPane: React.FC<EstimateItemRightPaneProps> = ({ 
  itemForm, 
  setItemForm, 
  isReadOnly = false,
  companyInfo 
}) => {
  return (
    <DocumentViewer
      isReadOnly={isReadOnly}
      files={itemForm.files || []}
      tempFiles={itemForm.tempFiles || []}
      onRemoveTempFile={(index) =>
        setItemForm(prev => ({
          ...prev,
          tempFiles: (prev.tempFiles || []).filter((_, i) => i !== index)
        }))
      }
      onRemoveDbFile={(fileId) =>
        setItemForm(prev => ({
          ...prev,
          files: (prev.files || []).filter((f: any) => f.id !== fileId)
        }))
      }
      onOcrResult={(text, mode) => {
        const fieldName = mode === 'material' ? 'original_material_name' : mode;
        setItemForm(prev => ({
          ...prev,
          [fieldName]: text
        }));
      }}
      onSaveMaskedPdf={(fileId, tempIndex, newFile) => {
        setItemForm(prev => {
          const nextTempFiles = [...(prev.tempFiles || [])];
          const nextDbFiles = [...(prev.files || [])];

          if (tempIndex !== null) {
            nextTempFiles[tempIndex] = newFile;
          } else if (fileId !== null) {
            const filteredDbFiles = nextDbFiles.filter((f: any) => f.id !== fileId);
            nextTempFiles.push(newFile);
            return {
              ...prev,
              files: filteredDbFiles,
              tempFiles: nextTempFiles
            };
          }

          return {
            ...prev,
            tempFiles: nextTempFiles
          };
        });
      }}
      onApplyDimensions={(dims) => {
        const isRound = dims.shape === 'round';
        const getMargin = (val: any, fallback: number) => {
          if (val === undefined || val === null || val === '') return fallback;
          const num = Number(val);
          return isNaN(num) ? fallback : num;
        };

        const spec_w = Number(dims.spec_w) || 0;
        const spec_d = Number(dims.spec_d) || 0;
        const spec_h = Number(dims.spec_h) || 0;

        let raw_w = 0;
        let raw_d = 0;
        let raw_h = 0;

        if (isRound) {
          const marginW = getMargin(companyInfo?.default_margin_round_w, 5);
          const marginD = getMargin(companyInfo?.default_margin_round_d, 5);
          raw_w = spec_w + (spec_w > 0 ? marginW : 0);
          raw_d = spec_d + (spec_d > 0 ? marginD : 0);
          raw_h = 0;
        } else {
          const marginW = getMargin(companyInfo?.default_margin_w, 5);
          const marginD = getMargin(companyInfo?.default_margin_d, 5);
          const marginH = getMargin(companyInfo?.default_margin_h, 0);
          raw_w = spec_w + (spec_w > 0 ? marginW : 0);
          raw_d = spec_d + (spec_d > 0 ? marginD : 0);
          raw_h = spec_h + (spec_h > 0 ? marginH : 0);
        }

        setItemForm(prev => ({
          ...prev,
          shape: dims.shape,
          spec_w,
          spec_d,
          spec_h,
          raw_w,
          raw_d,
          raw_h,
        }));
        toast.success(`3D 제품 치수 적용 완료 (${dims.shape === 'round' ? '원형(환봉)' : '사각(각재)'}: ${spec_w} × ${spec_d} × ${spec_h} ${dims.unit} / 원소재: ${raw_w} × ${raw_d} × ${raw_h})`);
      }}
    />
  );
};
