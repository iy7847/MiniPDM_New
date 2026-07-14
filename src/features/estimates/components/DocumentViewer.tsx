import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../shared/services/supabase';

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
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // ── Blob URL 캐시 (WeakMap 기반) ────────────────────────────────────────
  // 같은 File 객체에 대해 URL.createObjectURL 을 딱 한 번만 실행,
  // 매 렌더링마다 새 URL 이 생성되어 iframe 이 깜빡이는 현상을 원천 차단합니다.
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

  const totalFiles = [...files, ...tempFiles];

  // activeIndex 가 범위를 벗어나지 않도록 안전 처리
  const safeIndex = totalFiles.length === 0 ? 0 : Math.min(activeIndex, totalFiles.length - 1);

  // ── 빈 상태 (파일 없음) ─────────────────────────────────────────────────
  if (totalFiles.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-bg-base">
        <p className="text-text-secondary text-sm">첨부된 파일이 없습니다.</p>
      </div>
    );
  }

  const activeFile = totalFiles[safeIndex];
  const isTemp = safeIndex >= files.length;

  let fileUrl = '';
  let fileType = '';
  let fileName = '';

  if (isTemp) {
    const f = activeFile as File;
    fileUrl = getBlobUrl(f); // 캐시에서 가져옴 — 항상 같은 URL 반환
    fileType = f.type;
    fileName = f.name;
  } else {
    fileName = activeFile.file_name;
    // getPublicUrl 은 동기 호출이며 동일 경로에 대해 항상 동일한 문자열 반환
    const { data } = supabase.storage.from('estimates').getPublicUrl(activeFile.file_path);
    fileUrl = data.publicUrl;

    // 확장자로 MIME 타입 추론
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') fileType = 'application/pdf';
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) fileType = 'image/' + ext;
  }

  const isPdf = fileType === 'application/pdf';
  const isImage = fileType.startsWith('image/');

  return (
    <div className="w-full h-full flex flex-col bg-bg-surface overflow-hidden">
      {/* 파일 탭 목록 */}
      <div className="flex bg-bg-elevated border-b border-border-default overflow-x-auto custom-scrollbar shrink-0">
        {totalFiles.map((f, idx) => {
          const isLocal = idx >= files.length;
          const name = isLocal ? (f as File).name : (f as any).file_name;
          const isActive = idx === safeIndex;
          return (
            <div
              key={idx}
              className={`group flex items-center gap-1 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer shrink-0
                ${isActive
                  ? 'border-brand-500 text-brand-500 bg-brand-500/10'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface'}`}
              onClick={() => setActiveIndex(idx)}
            >
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

      {/* 뷰어 영역 — 드래그앤드랍 없음 (헤더 드랍존에서 처리) */}
      <div className="flex-1 overflow-hidden relative bg-black/20 flex items-center justify-center">
        {isPdf ? (
          <iframe
            key={fileUrl} // URL이 실제로 바뀔 때만 iframe 재생성
            src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full border-none"
            title={fileName}
          />
        ) : isImage ? (
          <img
            src={fileUrl}
            alt={fileName}
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="text-text-secondary flex flex-col items-center">
            <p className="mb-2">미리보기를 지원하지 않는 파일 형식입니다.</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline"
            >
              다운로드
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
