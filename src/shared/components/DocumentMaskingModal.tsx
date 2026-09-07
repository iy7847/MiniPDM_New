import React from 'react';
import { X } from 'lucide-react';
import { EditablePdfViewer } from '../../features/estimates/components/EditablePdfViewer';

import { toast } from '../../shared/stores/useToastStore';

interface DocumentMaskingModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: any; // File | DB Object
  onSaveMaskedPdf: (newFile: File) => void;
  isViewerOnly?: boolean;
  autoCloseOnSave?: boolean;
  title?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const DocumentMaskingModal: React.FC<DocumentMaskingModalProps> = ({
  isOpen,
  onClose,
  file,
  onSaveMaskedPdf,
  isViewerOnly = false,
  autoCloseOnSave = true,
  title,
  headerActions
}) => {
  const [actualFile, setActualFile] = React.useState<File | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !file) {
      setActualFile(null);
      return;
    }

    if (file instanceof File) {
      setActualFile(file);
      return;
    }

    // DB Object (estimate_items.files)
    const loadFile = async () => {
      let filePath = file.file_path || file.path;
      if (filePath && (window as any).ipcRenderer) {
        setIsLoading(true);
        try {
          const res = await (window as any).ipcRenderer.invoke('read-local-file', filePath);
          if (res.success && res.data) {
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const f = new File([blob], file.file_name || 'document.pdf', { type: 'application/pdf' });
            setActualFile(f);
          } else {
            toast.error('파일을 불러오지 못했습니다: ' + (res.error || 'Unknown error'));
            setActualFile(null);
          }
        } catch (e: any) {
          toast.error('파일 로드 실패: ' + e.message);
          setActualFile(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadFile();
  }, [file, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default shrink-0">
          <h2 className="text-lg font-bold text-text-primary">
            {title ? title : (isViewerOnly ? '도면 뷰어' : '도면 뷰어 및 마스킹 (보안 처리)')}
          </h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button 
              onClick={onClose} 
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden relative bg-bg-base">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-overlay/50">
              <div className="text-white">파일 불러오는 중...</div>
            </div>
          )}
          {actualFile && (
            <EditablePdfViewer
              file={actualFile}
              isViewerOnly={isViewerOnly}
              onSaveMaskedPdf={(newFile) => {
                onSaveMaskedPdf(newFile);
                if (autoCloseOnSave) {
                  onClose();
                }
              }}
            />
          )}
          {!isLoading && !actualFile && (
            <div className="flex items-center justify-center h-full text-text-secondary">
              파일을 렌더링할 수 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
