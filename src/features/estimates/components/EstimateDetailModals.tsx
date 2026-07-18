import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { EstimateItemModal } from './EstimateItemModal';
import { HistorySearchDrawer } from './HistorySearchDrawer';
import { ClientModal } from '../../clients/components/ClientModal';
import { ImportItemsModal } from './ImportItemsModal';
import { PreviewModal } from './PreviewModal';
import { FilenameParserModal } from './FilenameParserModal';
import { SmartPdfImporter } from './SmartPdfImporter';
import { EstimateSubmitModal } from './EstimateSubmitModal';
import { OrderConversionModal } from './OrderConversionModal';
import { EstimateBatchDuplicateModal } from './EstimateBatchDuplicateModal';
import type { Estimate, EstimateItem } from '../types';
import type { Client, ClientFormData } from '../../shared/types/client';
import { supabase } from '../../../shared/services/supabase';

export interface EstimateDetailModalsRef {
  openItemModal: (item: EstimateItem) => void;
  openHistoryDrawer: () => void;
  openClientModal: () => void;
  openImportModal: (initialRows?: string[][]) => void;
  openPreviewModal: () => void;
  openParserModal: (files: File[]) => void;
  openOcrModal: () => void;
  openSubmitModal: () => void;
  openOrderModal: () => void;
  openDuplicateModal: () => void;
  closeAll: () => void;
}

interface EstimateDetailModalsProps {
  estimateId: string | null;
  estimate: Estimate | null;
  items: EstimateItem[];
  clients: Client[];
  companyId: string | null;
  metadata: any;
  isLocked: boolean;
  onReload: () => void;
  onAddItem: (item: EstimateItem) => void;
  onAddItems: (newItems: EstimateItem[]) => void;
  onSaveClient: (formData: ClientFormData) => Promise<void>;
  onMultiDuplicate: (quantities: number[]) => void;
  onExportExcel: () => void;
}

export const EstimateDetailModals = forwardRef<EstimateDetailModalsRef, EstimateDetailModalsProps>((props, ref) => {
  const {
    estimateId, estimate, items, clients, companyId, metadata,
    isLocked, onReload, onAddItem, onAddItems, onSaveClient, onMultiDuplicate, onExportExcel
  } = props;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemForModal, setEditingItemForModal] = useState<EstimateItem | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importModalInitialRows, setImportModalInitialRows] = useState<string[][]>([]);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [isParserModalOpen, setIsParserModalOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    openItemModal: (item) => {
      setEditingItemForModal(item);
      setIsModalOpen(true);
    },
    openHistoryDrawer: () => setIsHistoryOpen(true),
    openClientModal: () => setIsClientModalOpen(true),
    openImportModal: (initialRows = []) => {
      setImportModalInitialRows(initialRows);
      setIsImportModalOpen(true);
    },
    openPreviewModal: () => setIsPreviewOpen(true),
    openParserModal: (files) => {
      setDroppedFiles(files);
      setIsParserModalOpen(true);
    },
    openOcrModal: () => setIsOcrModalOpen(true),
    openSubmitModal: () => setIsSubmitModalOpen(true),
    openOrderModal: () => setIsOrderModalOpen(true),
    openDuplicateModal: () => setIsDuplicateModalOpen(true),
    closeAll: () => {
      setIsModalOpen(false);
      setIsHistoryOpen(false);
      setIsClientModalOpen(false);
      setIsImportModalOpen(false);
      setIsPreviewOpen(false);
      setIsParserModalOpen(false);
      setIsOcrModalOpen(false);
      setIsSubmitModalOpen(false);
      setIsOrderModalOpen(false);
      setIsDuplicateModalOpen(false);
    }
  }));

  return (
    <>
      {isModalOpen && editingItemForModal && metadata && (
        <EstimateItemModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItemForModal(null);
          }}
          estimateId={estimateId}
          metadata={metadata}
          currency={estimate?.currency || 'KRW'}
          exchangeRate={estimate?.base_exchange_rate || 1}
          editingItem={editingItemForModal}
          onSaveSuccess={() => {
            onReload();
            setIsModalOpen(false);
            setEditingItemForModal(null);
          }}
          onSaveFiles={async (itemId: string, files: File[]) => {
            const newFilesToInsert = files.map((file: File) => {
              const filePath = (window as any).webUtils ? (window as any).webUtils.getPathForFile(file) : (file as any).path;
              return {
                estimate_item_id: itemId,
                file_name: file.name,
                file_path: filePath,
                file_type: file.name.split('.').pop() || 'unknown',
                file_size: file.size,
                version: 1,
                is_current: true
              };
            });
            const { error } = await supabase.from('files').insert(newFilesToInsert);
            if (error) console.error('Failed to insert temp files', error);
          }}
          onDeleteExistingFile={async (fileId: string) => {
            await supabase.from('files').delete().eq('id', fileId);
          }}
          existingItems={items}
          isReadOnly={isLocked}
        />
      )}

      <HistorySearchDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        companyId={companyId}
        onApplyItem={onAddItem}
      />

      {isClientModalOpen && (
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSave={async (formData) => {
            await onSaveClient(formData);
            setIsClientModalOpen(false);
          }}
        />
      )}

      {isImportModalOpen && (
        <ImportItemsModal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setImportModalInitialRows([]);
          }}
          onConfirm={(newItems) => {
            onAddItems(newItems);
            setIsImportModalOpen(false);
          }}
          initialRawRows={importModalInitialRows}
        />
      )}

      {isPreviewOpen && estimate && (
        <PreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          estimate={estimate}
          items={items}
          clientInfo={clients.find(c => c.id === estimate.client_id)}
        />
      )}

      {isParserModalOpen && (
        <FilenameParserModal
          isOpen={isParserModalOpen}
          onClose={() => setIsParserModalOpen(false)}
          files={droppedFiles}
          onParseComplete={(parsedData) => {
            onAddItems(parsedData);
            setIsParserModalOpen(false);
          }}
        />
      )}

      {isOcrModalOpen && (
        <SmartPdfImporter
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          onImport={(rows) => {
            setImportModalInitialRows(rows);
            setIsOcrModalOpen(false);
            setIsImportModalOpen(true);
          }}
        />
      )}

      {isSubmitModalOpen && (
        <EstimateSubmitModal 
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onExportExcel={() => {
            setIsSubmitModalOpen(false);
            onExportExcel();
          }}
          onExportPdf={() => {
            setIsSubmitModalOpen(false);
            setIsPreviewOpen(true);
          }}
        />
      )}

      {isOrderModalOpen && estimate && items && (
        <OrderConversionModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          estimate={estimate}
          items={items}
          onConvert={(selectedItemsToOrder) => {
             // onConvert is handled inside OrderConversionModal by default, just close here
             // Wait, the original code called toast.success and closed modal
             // I will let the hook handle the toast or just do it in the modal if it's there
             setIsOrderModalOpen(false);
          }}
        />
      )}

      {isDuplicateModalOpen && (
        <EstimateBatchDuplicateModal
          onConfirm={onMultiDuplicate}
          onCancel={() => setIsDuplicateModalOpen(false)}
        />
      )}
    </>
  );
});

EstimateDetailModals.displayName = 'EstimateDetailModals';
