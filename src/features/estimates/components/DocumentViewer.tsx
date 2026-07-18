import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, Box, FileType } from 'lucide-react';
import { supabase } from '../../../shared/services/supabase';
import { EXT_2D, EXT_3D } from '../utils/fileMatching';
import { toast } from '../../../shared/stores/useToastStore';

interface DocumentViewerProps {
  files: any[];        // DB에 저장된 파일 목록 (file_path, file_name, file_type)
  tempFiles?: File[];  // 아직 업로드 전 로컬 File 객체 목록
  onRemoveDbFile?: (fileId: string) => void;    // DB 파일 제거 콜백
  onRemoveTempFile?: (index: number) => void;   // 임시 파일 제거 콜백
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  files = [],
  tempFiles = [],
  onRemoveDbFile,
  onRemoveTempFile,
}) => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);

  useEffect(() => {
    let dragCounter = 0;
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) setIsDraggingGlobal(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) setIsDraggingGlobal(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDraggingGlobal(false);
    };
    
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // ── 빈 상태 처리 전 Hook 선언 ────────────────────────────────────────────
  // 같은 File 객체에 대해 URL.createObjectURL 을 딱 한 번만 실행,
  // 매 렌더링마다 새 URL 이 생성되어 iframe 이 깜빡이는 현상을 원천 차단합니다.
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const blobUrlCache = useRef<WeakMap<File, string>>(new WeakMap());

  const getBlobUrl = (file: File): string => {
    if (!blobUrlCache.current.has(file)) {
      blobUrlCache.current.set(file, URL.createObjectURL(file));
    }
    return blobUrlCache.current.get(file)!;
  };

  // 컴포넌트 언마운트 시 생성한 Blob URL 메모리 해제
  useEffect(() => {
    const cache = blobUrlCache.current;
    return () => {
      (tempFiles || []).forEach(f => {
        const url = cache.get(f);
        if (url) URL.revokeObjectURL(url);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 파일 제거 핸들러 ────────────────────────────────────────────────────
  const handleRemove = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const totalCount = files.length + (tempFiles?.length || 0);
    const isTemp = idx >= files.length;

    if (isTemp) {
      onRemoveTempFile?.(idx - files.length);
    } else {
      const fileId = files[idx]?.id;
      if (fileId) onRemoveDbFile?.(fileId);
    }

    // 삭제 후 activeIndex 보정
    const nextTotal = totalCount - 1;
    if (nextTotal === 0) {
      setActiveIndex(0);
    } else if (idx <= activeIndex) {
      setActiveIndex(Math.max(0, activeIndex - 1));
    }
  };

  // ── 빈 상태 처리 전 Hook 선언 ──────────────────────────────────────────
  const [dbUrls, setDbUrls] = useState<Record<string, string>>({});
  const [loadingDbFile, setLoadingDbFile] = useState<boolean>(false);
  const [dbFileError, setDbFileError] = useState<string | null>(null);

  // 컴포넌트 언마운트 시 생성한 DB Blob URL 메모리 해제
  useEffect(() => {
    return () => {
      Object.values(dbUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [dbUrls]);

  const totalFiles = [...files, ...tempFiles];
  // activeIndex 가 범위를 벗어나지 않도록 안전 처리
  const safeIndex = totalFiles.length === 0 ? 0 : Math.min(activeIndex, totalFiles.length - 1);
  const activeFile = totalFiles[safeIndex];
  const isTemp = safeIndex >= files.length;

  // DB 파일 로드 이펙트
  useEffect(() => {
    if (isTemp || !activeFile || !activeFile.id) return;
    
    const fileId = activeFile.id;
    if (dbUrls[fileId]) return; // 이미 로드됨

    const loadLocalFile = async () => {
      try {
        setLoadingDbFile(true);
        setDbFileError(null);
        
        if (!(window as any).ipcRenderer) {
          setDbFileError('로컬 도면 파일은 데스크톱 앱 환경에서만 조회할 수 있습니다.');
          setLoadingDbFile(false);
          return;
        }

        const dbPath = activeFile.file_path || '';
        let fullPath = dbPath;
        // 드라이브 문자로 시작하거나 슬래시로 시작하는 절대 경로인지 확인
        if (!dbPath.match(/^[a-zA-Z]:[\\/]/) && !dbPath.startsWith('/')) {
          const companyRootPath = localStorage.getItem('company_root_path') || 'D:\\99_ETC\\임시데이터';
          fullPath = `${companyRootPath}\\${dbPath}`;
        }

        const response = await (window as any).ipcRenderer.invoke('read-local-file', fullPath);
        if (response.success) {
          const ext = activeFile.file_name?.split('.').pop()?.toLowerCase() || '';
          let mimeType = 'application/octet-stream';
          if (ext === 'pdf') mimeType = 'application/pdf';
          else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          
          const blob = new Blob([response.data], { type: mimeType });
          const url = URL.createObjectURL(blob);
          setDbUrls(prev => ({ ...prev, [fileId]: url }));
        } else {
          setDbFileError('파일을 찾을 수 없거나 읽을 수 없습니다: ' + response.error);
        }
      } catch (err: any) {
        setDbFileError(err.message || '파일 로드 오류');
      } finally {
        setLoadingDbFile(false);
      }
    };

    loadLocalFile();
  }, [isTemp, activeFile, dbUrls]);

  // ── 빈 상태 (파일 없음) ─────────────────────────────────────────────────
  if (totalFiles.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-bg-base">
        <p className="text-text-secondary text-sm">첨부된 파일이 없습니다.</p>
      </div>
    );
  }


  let fileUrl = '';
  let fileType = '';
  let fileName = '';

  if (isTemp) {
    const f = activeFile as File;
    fileUrl = getBlobUrl(f); // 캐시에서 가져옴 — 항상 같은 URL 반환
    fileType = f.type;
    fileName = f.name;
  } else if (activeFile) {
    fileName = activeFile.file_name || '';
    fileUrl = dbUrls[activeFile.id] || '';
    
    // 확장자로 MIME 타입 추론
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') fileType = 'application/pdf';
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) fileType = 'image/' + ext;
  }

  const isPdf = fileType === 'application/pdf';
  const isImage = fileType.startsWith('image/');

  return (
    <div className="w-full h-full flex flex-col bg-bg-surface overflow-hidden" data-dragging={isDraggingGlobal}>
      {/* 파일 탭 목록 */}
      <div className="flex bg-bg-elevated border-b border-border-default overflow-x-auto custom-scrollbar shrink-0">
        {totalFiles.map((f, idx) => {
          const isLocal = idx >= files.length;
          const name = isLocal ? (f as File).name : (f as any).file_name;
          const isActive = idx === safeIndex;
          const extName = '.' + (name.split('.').pop()?.toLowerCase() || '');
          const is3D = EXT_3D.includes(extName);
          
          return (
            <div
              key={idx}
              className={`group flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer shrink-0
                ${isActive
                  ? 'border-brand-500 text-brand-500 bg-brand-500/10'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface'}`}
              onClick={() => setActiveIndex(idx)}
            >
              <div className="flex items-center text-text-tertiary group-hover:text-text-secondary">
                {is3D ? <Box size={14} /> : <FileText size={14} />}
              </div>
              <span className="max-w-[120px] truncate" title={name}>{name}</span>
              {/* X 버튼 — 탭 호버 시 표시 */}
              <button
                className={`ml-1 rounded-full p-0.5 transition-colors
                  ${isActive
                    ? 'text-brand-400 hover:text-white hover:bg-brand-500'
                    : 'text-transparent group-hover:text-text-secondary group-hover:hover:text-white group-hover:hover:bg-red-500'}`}
                title="파일 제거"
                onPointerDown={(e) => handleRemove(e, idx)}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* 뷰어 영역 */}
      <div className="flex-1 relative w-full h-full bg-bg-base/50">
        {/* PDF 등 iframe이 드래그 이벤트를 삼키는 것을 방지하는 투명 오버레이 */}
        <div className="absolute inset-0 z-[100] pointer-events-none group-data-[dragging=true]:pointer-events-auto" />
        
        {(!isTemp && loadingDbFile) ? (
          <div className="text-text-secondary animate-pulse">로컬 파일 읽는 중...</div>
        ) : (!isTemp && dbFileError) ? (
          <div className="text-status-danger text-center px-4">
            <p className="font-bold mb-1">파일 열기 실패</p>
            <p className="text-sm opacity-80">{dbFileError}</p>
          </div>
        ) : isPdf && fileUrl ? (
          <embed
            key={fileUrl}
            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            type="application/pdf"
            className="w-full h-full border-none"
            title={fileName}
          />
        ) : isImage && fileUrl ? (
          <img
            src={fileUrl}
            alt={fileName}
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="text-text-secondary flex flex-col items-center justify-center h-full">
            {fileUrl || isTemp ? (
              <>
                <p className="mb-4">미리보기를 지원하지 않는 파일 형식입니다.</p>
                <button
                  onClick={async () => {
                    const fullPath = isTemp ? ((window as any).webUtils ? (window as any).webUtils.getPathForFile(activeFile) : (activeFile as any).path) : (activeFile as any).file_path;
                    if (!fullPath) {
                      toast.error('파일 경로를 찾을 수 없어 실행할 수 없습니다.');
                      return;
                    }
                    const res = await (window as any).ipcRenderer.invoke('open-local-file', fullPath);
                    if (!res.success) {
                      toast.error(`파일 열기 실패: ${res.error}`);
                    }
                  }}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg shadow-sm transition-colors font-medium flex items-center gap-2"
                >
                  <FileType size={16} />
                  연결된 프로그램으로 바로 열기
                </button>
              </>
            ) : (
              <p>파일 정보가 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
