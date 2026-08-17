import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (file: File | null) => void;
  previewUrl?: string | null;
  className?: string;
}

/**
 * 불량 발생 시 사진을 찍거나 첨부할 수 있는 이미지 업로더 컴포넌트
 */
export function ImageUploader({ onImageSelected, previewUrl: initialPreview, className = '' }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(initialPreview || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setPreview(null);
    onImageSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`relative flex flex-col items-center justify-center w-full border-2 border-dashed border-border-default rounded-xl bg-bg-surface overflow-hidden transition-colors hover:border-brand ${className}`}>
      {preview ? (
        <>
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-danger transition-colors"
          >
            <X size={20} />
          </button>
        </>
      ) : (
        <div 
          className="flex flex-col items-center justify-center w-full h-full min-h-[160px] p-4 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} className="text-text-secondary mb-3" />
          <p className="text-sm font-medium text-text-primary text-center">
            클릭하여 사진 첨부<br />
            <span className="text-xs text-text-secondary font-normal">(또는 카메라로 촬영)</span>
          </p>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment" // 모바일 기기에서 후면 카메라 우선 호출
        className="hidden"
      />
    </div>
  );
}
