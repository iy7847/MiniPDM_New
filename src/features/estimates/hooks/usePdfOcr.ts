import { useState } from 'react';
import Tesseract from 'tesseract.js';
import { pdfjs } from 'react-pdf';
import type { OcrResult, Mask } from '../components/SmartPdfTypes';

export function usePdfOcr(
  file: File | null,
  pageNumber: number,
  RENDER_WIDTH: number,
  setIsProcessing: (b: boolean) => void,
  setOcrResults?: React.Dispatch<React.SetStateAction<OcrResult[]>>,
  ocrMode?: 'part_no' | 'part_name' | 'material',
  onOcrComplete?: (text: string) => void
) {
  const [masks, setMasks] = useState<Mask[]>([]);
  const [isMaskMode, setIsMaskMode] = useState(false);

  const handleDeleteMask = (index: number) => {
    const pageMasks = masks.filter(m => m.page === pageNumber);
    const targetMask = pageMasks[index];
    if (targetMask) {
      setMasks(prev => prev.filter(m => m !== targetMask));
    }
  };

  const runOCR = async (rectSelection: { x: number, y: number, w: number, h: number }) => {
    if (!file) return;

    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(pageNumber);

      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) return;

      await page.render({ canvasContext: context, viewport } as any).promise;

      const viewerWidth = RENDER_WIDTH;
      const scaleFactor = viewport.width / viewerWidth;

      const cropX = rectSelection.x * scaleFactor;
      const cropY = rectSelection.y * scaleFactor;
      const cropW = rectSelection.w * scaleFactor;
      const cropH = rectSelection.h * scaleFactor;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const croppedCtx = croppedCanvas.getContext('2d');

      if (croppedCtx) {
        croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const dataUrl = croppedCanvas.toDataURL('image/png');

        const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng+kor');
        const cleanText = text.replace(/\n/g, ' ').trim();

        // 1. 단일 콜백이 제공된 경우 (단일 뷰어용)
        if (onOcrComplete) {
          onOcrComplete(cleanText);
        }

        // 2. 다중 리스트 업데이트용 (기존 동작)
        if (setOcrResults && ocrMode) {
          setOcrResults(prev => {
            const newResults = [...prev];
            const currentItem = newResults[pageNumber - 1];
            if (!currentItem) return newResults;

            if (ocrMode === 'part_no') currentItem.part_no = cleanText;
            if (ocrMode === 'part_name') currentItem.part_name = cleanText;
            if (ocrMode === 'material') currentItem.material = cleanText;

            currentItem.thumbnail = dataUrl;
            currentItem.status = 'success';

            return newResults;
          });
        }
      }
    } catch (e) {
      console.error(e);
      alert('OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    masks,
    setMasks,
    isMaskMode,
    setIsMaskMode,
    handleDeleteMask,
    runOCR
  };
}
