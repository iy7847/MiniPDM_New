import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { Button } from '../../design-system/Button';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: any;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, file }) => {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && file) {
      setScale(1);
      
      // 파일 객체가 직접 들어온 경우 (Blob/File)
      if (file instanceof File || file instanceof Blob) {
        const url = URL.createObjectURL(file);
        setImageSrc(url);
        return () => URL.revokeObjectURL(url);
      } 
      // 로컬 파일 경로가 있는 경우 (Electron 등에서 webUtils 변환 후)
      else if (file.file_path || file.path) {
        let filePath = file.file_path || file.path;
        if ((window as any).webUtils && file.originalFile instanceof File) {
          try {
            filePath = (window as any).webUtils.getPathForFile(file.originalFile);
          } catch (e) {}
        }
        
        // 브라우저 환경 보안 정책상 로컬 절대 경로를 직접 img 태그에 넣을 순 없지만, 
        // 앱 내에서 프로토콜 핸들러나 상대 경로, url로 제공된 경우를 처리.
        // 여기선 우선 file.url이 있거나, file이 자체 URL을 가지고 있는 경우를 체크.
        if (file.url) {
          setImageSrc(file.url);
        } else {
          // Electron 프로토콜 같은게 등록되어 있다고 가정 (ex: local://)
          setImageSrc(`local://${filePath.replace(/\\/g, '/')}`);
        }
      }
    } else {
      setImageSrc('');
    }
  }, [isOpen, file]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-overlay/80 backdrop-blur-sm p-4">
      <div className="relative flex flex-col bg-bg-surface w-full max-w-5xl max-h-[90vh] rounded-lg shadow-2xl border border-border-default overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-elevated">
          <div className="font-medium text-text-primary truncate pr-4">
            {file?.name || file?.file_name || '이미지 미리보기'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setScale(s => Math.min(s + 0.25, 3))} className="text-text-secondary" icon={<ZoomIn size={16} />} />
            <span className="text-xs font-mono text-text-disabled w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={() => setScale(s => Math.max(s - 0.25, 0.25))} className="text-text-secondary" icon={<ZoomOut size={16} />} />
            <div className="w-px h-4 bg-border-default mx-1"></div>
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-md hover:bg-bg-surface transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-bg-base/50 flex items-center justify-center min-h-[300px]">
          {imageSrc ? (
            <img 
              src={imageSrc} 
              alt="Preview" 
              className="max-w-none transition-transform duration-200"
              style={{ transform: `scale(${scale})` }}
              onError={(e) => {
                // 로컬 이미지 로드 실패 시 폴백
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('error')) {
                  // 백엔드나 Blob 등 우회 경로 시도
                  if (file instanceof File) {
                    target.src = URL.createObjectURL(file);
                  }
                }
              }}
            />
          ) : (
            <div className="text-text-disabled flex flex-col items-center gap-2">
              <span className="text-sm">이미지를 불러올 수 없습니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
