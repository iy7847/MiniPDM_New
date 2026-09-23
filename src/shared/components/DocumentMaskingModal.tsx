import React from 'react';
import { X, Check } from 'lucide-react';
import { EditablePdfViewer } from '../../features/estimates/components/EditablePdfViewer';
import { Button } from '../../design-system/Button';
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
  autoCloseOnSave = false,
  title,
  headerActions
}) => {
  const [actualFile, setActualFile] = React.useState<File | null>(null);
  const [resolvedLocalPath, setResolvedLocalPath] = React.useState<string | null>(null);
  const [fileVersion, setFileVersion] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSavedRecently, setIsSavedRecently] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !file) {
      setActualFile(null);
      setResolvedLocalPath(null);
      setFileVersion(0);
      setIsSavedRecently(false);
      return;
    }

    // 이미 File 인스턴스인 경우
    if (file instanceof File) {
      setActualFile(file);
      let localPath = (file as any).path || (file as any).file_path;
      if (!localPath && (window as any).webUtils?.getPathForFile) {
        try {
          localPath = (window as any).webUtils.getPathForFile(file);
        } catch (e) {
          // ignore
        }
      }
      setResolvedLocalPath(localPath || null);
      return;
    }

    // DB Object (files, estimate_items.files 등)
    const loadFile = async () => {
      let filePath = file.file_path || file.path;
      if (filePath && (window as any).ipcRenderer) {
        setIsLoading(true);
        try {
          // 상대 경로일 경우 로컬 스토리지의 company_root_path 와 안전하게 결합
          const companyRootPath = localStorage.getItem('company_root_path') || 'D:\\99_ETC\\임시데이터';
          let pathToRead = filePath;
          const isAbsolute = filePath.includes(':') || filePath.startsWith('\\\\') || filePath.startsWith('/');
          if (!isAbsolute) {
            pathToRead = `${companyRootPath}\\${filePath}`.replace(/\//g, '\\');
          }

          let res = await (window as any).ipcRenderer.invoke('read-local-file', pathToRead);
          
          // 경로 결합본으로 실패하고 원본 filePath와 다르다면 원본으로도 한번 더 시도
          if (!res.success && pathToRead !== filePath) {
            const fallbackRes = await (window as any).ipcRenderer.invoke('read-local-file', filePath);
            if (fallbackRes.success) {
              res = fallbackRes;
              pathToRead = filePath;
            }
          }

          if (res.success && res.data) {
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const f = new File([blob], file.file_name || file.name || 'document.pdf', { type: 'application/pdf' });
            setActualFile(f);
            setResolvedLocalPath(pathToRead);
          } else {
            toast.error('파일을 불러오지 못했습니다: ' + (res.error || 'Unknown error'));
            setActualFile(null);
            setResolvedLocalPath(null);
          }
        } catch (e: any) {
          toast.error('파일 로드 실패: ' + e.message);
          setActualFile(null);
          setResolvedLocalPath(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadFile();
  }, [file, isOpen]);

  // 마스킹 저장 핸들러
  const handleSaveMaskedPdfInternal = async (newFile: File) => {
    try {
      // 1. 디스크 상의 원본 로컬 파일이 있는 경우 즉시 덮어쓰기 저장
      if (resolvedLocalPath && (window as any).ipcRenderer) {
        try {
          const buffer = await newFile.arrayBuffer();
          const res = await (window as any).ipcRenderer.invoke('write-local-file', {
            filePath: resolvedLocalPath,
            data: buffer
          });
          if (res && !res.success) {
            console.error('[DocumentMaskingModal] 로컬 파일 덮어쓰기 실패:', res.error);
          }
        } catch (fileWriteErr) {
          console.error('[DocumentMaskingModal] 로컬 파일 쓰기 에러:', fileWriteErr);
        }
      }

      // 2. 부모 콜백 호출하여 React 상위 상태(tempFiles, DB 등) 동기화
      if (onSaveMaskedPdf) {
        onSaveMaskedPdf(newFile);
      }

      // 3. 모달 내부 뷰어의 실제 파일 상태를 새 마스킹 파일로 교체하여 즉시 화면 갱신
      setActualFile(newFile);
      setFileVersion(prev => prev + 1);
      setIsSavedRecently(true);

      toast.success('마스킹이 파일에 성공적으로 저장되었습니다. 확인 후 창을 닫아주세요.');

      // 4. autoCloseOnSave가 명시적으로 true인 경우에만 창 닫기
      if (autoCloseOnSave) {
        onClose();
      }
    } catch (err: any) {
      console.error('[DocumentMaskingModal] 마스킹 저장 처리 중 오류:', err);
      toast.error('마스킹 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-text-primary">
              {title ? title : (isViewerOnly ? '도면 뷰어' : '도면 뷰어 및 마스킹 (보안 처리)')}
            </h2>
            {isSavedRecently && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-status-success/10 text-status-success border border-status-success/30 font-medium animate-in fade-in">
                <Check size={13} /> 마스킹 저장됨 (결과 확인 가능)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            {!isViewerOnly && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="text-xs px-3"
              >
                닫기
              </Button>
            )}
            <button 
              onClick={onClose} 
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded"
              title="창 닫기"
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
              key={`${actualFile.name}-${fileVersion}`}
              file={actualFile}
              isViewerOnly={isViewerOnly}
              onSaveMaskedPdf={handleSaveMaskedPdfInternal}
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
