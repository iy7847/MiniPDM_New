import { PDFDocument, rgb } from 'pdf-lib';
import type { OcrResult, Mask } from '../components/SmartPdfTypes';
import type { EstimateItem } from '../types';
import { createInitialItemForm } from '../types';
import { toast } from '@/shared/stores/useToastStore';

const getDirectoryPath = (filePath: string) => {
  const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : '';
};

export function usePdfExport() {
  const exportPdf = async (
    file: File | null,
    ocrResults: OcrResult[],
    masks: Mask[],
    RENDER_WIDTH: number,
    companyInfo: any,
    onImportComplete: (items: EstimateItem[]) => void,
    onClose: () => void,
    setIsProcessing: (b: boolean) => void
  ) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const newItems = [];

      const validResults = ocrResults.filter(res => !res.skip);
      const originalName = file.name.replace(/\.pdf$/i, '');

      for (const res of validResults) {
        const subDoc = await PDFDocument.create();
        const [copiedPage] = await subDoc.copyPages(srcDoc, [res.page - 1]);
        const embeddedPage = subDoc.addPage(copiedPage);

        // [Phase 4.1] 마스킹 적용
        const pageMasks = masks.filter(m => m.page === res.page);
        if (pageMasks.length > 0) {
          const { width, height } = embeddedPage.getSize();
          const scaleFactor = width / RENDER_WIDTH;

          pageMasks.forEach(mask => {
            const pdfX = mask.x * scaleFactor;
            const pdfW = mask.w * scaleFactor;
            const pdfH = mask.h * scaleFactor;
            const pdfY = height - (mask.y * scaleFactor) - pdfH;

            embeddedPage.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              color: rgb(1, 1, 1), // White
              borderColor: undefined,
              borderWidth: 0,
            });
          });
        }

        const pdfBytes = await subDoc.save();
        const partNo = res.part_no || `${originalName}_P${res.page}`;
        const partName = res.part_name || `도면 ${res.page}페이지`;
        const safeName = (res.part_no || res.part_name || `${originalName}_P${res.page}`).replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim();
        const pdfFileName = `${safeName}.pdf`;

        const pdfFile = new File([pdfBytes as any], pdfFileName, { type: 'application/pdf' });
        
        const newItem: EstimateItem = {
          ...createInitialItemForm(companyInfo),
          id: crypto.randomUUID(),
          part_no: partNo,
          part_name: partName,
          original_material_name: res.material || '',
          tempFiles: [pdfFile],
          qty: 1
        };
        newItems.push(newItem);
      }

      onImportComplete(newItems);
      onClose();
    } catch (e: any) {
      console.error('[SmartPdfImporter] Error in handleApply:', e);
      toast.error('PDF 분할 저장 중 오류가 발생했습니다: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportSplitFilesToLocal = async (
    file: File | null,
    ocrResults: OcrResult[],
    masks: Mask[],
    RENDER_WIDTH: number,
    setIsProcessing: (b: boolean) => void
  ) => {
    if (!file) return;

    let targetDir = '';
    let sourcePath = (file as any).path;
    if (!sourcePath && (window as any).webUtils) {
      try {
        sourcePath = (window as any).webUtils.getPathForFile(file);
      } catch (e) {}
    }

    if (sourcePath) {
      targetDir = getDirectoryPath(sourcePath);
    }

    // 만약 targetDir을 찾지 못했다면 Electron 폴더 선택 다이얼로그 띄우기
    if (!targetDir && (window as any).ipcRenderer) {
      const selectRes = await (window as any).ipcRenderer.invoke('select-directory', '분할된 PDF 파일을 저장할 폴더를 선택하세요');
      if (selectRes?.success && selectRes.folderPath) {
        targetDir = selectRes.folderPath;
      } else if (selectRes?.canceled) {
        return; // 사용자가 선택 취소
      }
    }

    if (!targetDir) {
      toast.error('저장할 대상 폴더를 찾을 수 없습니다.');
      return;
    }

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);

      const validResults = ocrResults.filter(res => !res.skip);
      let savedCount = 0;

      for (const res of validResults) {
        const subDoc = await PDFDocument.create();
        const [copiedPage] = await subDoc.copyPages(srcDoc, [res.page - 1]);
        const embeddedPage = subDoc.addPage(copiedPage);

        // [Phase 4.1] 마스킹 적용
        const pageMasks = masks.filter(m => m.page === res.page);
        if (pageMasks.length > 0) {
          const { width, height } = embeddedPage.getSize();
          const scaleFactor = width / RENDER_WIDTH;

          pageMasks.forEach(mask => {
            const pdfX = mask.x * scaleFactor;
            const pdfW = mask.w * scaleFactor;
            const pdfH = mask.h * scaleFactor;
            const pdfY = height - (mask.y * scaleFactor) - pdfH;

            embeddedPage.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              color: rgb(1, 1, 1), // White
              borderColor: undefined,
              borderWidth: 0,
            });
          });
        }

        const pdfBytes = await subDoc.save();
        const originalName = file.name.replace(/\.pdf$/i, '');
        const baseName = res.part_no || res.part_name || `${originalName}_Page_${res.page}`;
        const safeName = baseName.replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim();
        const pdfFileName = `${safeName}.pdf`;

        // filePath 조합 (간단히 '/' 나 '\'를 추가)
        const separator = targetDir.includes('\\') ? '\\' : '/';
        const fullPath = `${targetDir}${separator}${pdfFileName}`;

        const result = await (window as any).ipcRenderer.invoke('write-local-file', {
          filePath: fullPath,
          data: pdfBytes
        });

        if (!result.success) {
          console.error(`Failed to save ${pdfFileName}:`, result.error);
        } else {
          savedCount++;
        }
      }

      toast.success(`${savedCount}개 파일이 원본 폴더에 분할 저장되었습니다 (경로: ${targetDir})`);
    } catch (e: any) {
      console.error(e);
      toast.error('파일 분할 저장 중 오류가 발생했습니다: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportSinglePdfWithMask = async (
    file: File | null,
    masks: Mask[],
    RENDER_WIDTH: number,
    setIsProcessing: (b: boolean) => void
  ): Promise<File | null> => {
    if (!file) return null;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);

      // 모든 페이지에 대해 반복 (혹은 마스크가 있는 페이지만)
      for (const mask of masks) {
        // PDF-lib 페이지 인덱스는 0부터 시작 (mask.page는 1부터 시작)
        const pageIndex = mask.page - 1;
        const pages = srcDoc.getPages();
        if (pageIndex < 0 || pageIndex >= pages.length) continue;
        
        const targetPage = pages[pageIndex];
        const { width, height } = targetPage.getSize();
        const scaleFactor = width / RENDER_WIDTH;

        const pdfX = mask.x * scaleFactor;
        const pdfW = mask.w * scaleFactor;
        const pdfH = mask.h * scaleFactor;
        const pdfY = height - (mask.y * scaleFactor) - pdfH;

        targetPage.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          color: rgb(1, 1, 1), // White
          borderColor: undefined,
          borderWidth: 0,
        });
      }

      const pdfBytes = await srcDoc.save();
      return new File([pdfBytes as any], file.name, { type: 'application/pdf' });
    } catch (e: any) {
      console.error('[exportSinglePdfWithMask] Error:', e);
      toast.error('마스킹 적용 중 오류가 발생했습니다: ' + e.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { exportPdf, exportSplitFilesToLocal, exportSinglePdfWithMask };
}
