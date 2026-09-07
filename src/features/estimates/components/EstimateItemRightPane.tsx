import React from 'react';
import type { EstimateItem } from '../types';
import { DocumentViewer } from './DocumentViewer';

interface EstimateItemRightPaneProps {
  itemForm: EstimateItem;
  setItemForm: React.Dispatch<React.SetStateAction<EstimateItem>>;
  isReadOnly?: boolean;
}

export const EstimateItemRightPane: React.FC<EstimateItemRightPaneProps> = ({ itemForm, setItemForm, isReadOnly = false }) => {
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
    />
  );
};
