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
  onUpdateItem?: (item: EstimateItem) => void;
  onSaveClient: (formData: ClientFormData) => Promise<void>;
  onMultiDuplicate: (quantities: number[]) => void;
  onExportExcel: () => void;
  onConvertOrder?: (selectedItems: any[]) => Promise<void>;
  showForeign?: boolean;
}

export const EstimateDetailModals = forwardRef<EstimateDetailModalsRef, EstimateDetailModalsProps>((props, ref) => {
  const {
    estimateId, estimate, items, clients, companyId, metadata,
    isLocked, onReload, onAddItem, onAddItems, onUpdateItem, onSaveClient, onMultiDuplicate, onExportExcel, showForeign
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
          onSaveSuccess={(item) => {
            if (editingItemForModal) {
              onUpdateItem?.(item);
            } else {
              onAddItem(item);
            }
            setIsModalOpen(false);
            setEditingItemForModal(null);
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
          companyInfo={metadata?.companyInfo}
        />
      )}

      {isPreviewOpen && estimate && (
        <PreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          estimate={estimate}
          items={items}
          clientInfo={clients.find(c => c.id === estimate.client_id)}
          showForeign={showForeign}
        />
      )}

      {isParserModalOpen && (
        <FilenameParserModal
          isOpen={isParserModalOpen}
          onClose={() => setIsParserModalOpen(false)}
          files={droppedFiles}
          companyInfo={metadata?.companyInfo}
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
          companyInfo={metadata?.companyInfo}
          onImportComplete={(items) => {
            onAddItems(items as any);
            setIsOcrModalOpen(false);
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
          onConvert={async (selectedItemsToOrder) => {
             if (props.onConvertOrder) {
               await props.onConvertOrder(selectedItemsToOrder);
             }
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
