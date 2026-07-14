import { PDFDocument, rgb } from 'pdf-lib';
import type { OcrResult, Mask } from '../components/SmartPdfTypes';

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
    onImportComplete: (files: File[]) => void,
    onClose: () => void,
    setIsProcessing: (b: boolean) => void
  ) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const newItems = [];

      const validResults = ocrResults.filter(res => !res.skip && res.part_no);

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
        const safeName = (res.part_no || res.part_name || `Page${res.page}`).replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim();
        const pdfFileName = `${safeName}.pdf`;

        const pdfFile = new File([pdfBytes as any], pdfFileName, { type: 'application/pdf' });
        newItems.push(pdfFile);
      }

      onImportComplete(newItems);
      onClose();
    } catch (e: any) {
      console.error('[SmartPdfImporter] Error in handleApply:', e);
      alert('PDF 분할 저장 중 오류가 발생했습니다: ' + e.message);
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

    const sourcePath = (file as any).path;
    if (!sourcePath || !(window as any).fileSystem) {
      return alert('이 기능은 Electron 데스크탑 앱에서만 지원됩니다.\n(웹 브라우저에서는 원본 경로 접근 불가)');
    }

    const targetDir = getDirectoryPath(sourcePath);
    if (!targetDir) return alert('저장 경로를 찾을 수 없습니다.');

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);

      const validResults = ocrResults.filter(res => !res.skip && res.part_no);
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
        const safeName = (res.part_no || res.part_name || `Page${res.page}`).replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim();
        const pdfFileName = `${safeName}.pdf`;

        const result = await (window as any).fileSystem.writeFile(
          pdfBytes,
          pdfFileName,
          targetDir,
          ''
        );

        if (!result.success) {
          console.error(`Failed to save ${pdfFileName}:`, result.error);
        } else {
          savedCount++;
        }
      }

      alert(`${savedCount}개 파일이 원본 폴더에 분할 저장되었습니다.\n경로: ${targetDir}`);
    } catch (e: any) {
      console.error(e);
      alert('파일 분할 저장 중 오류가 발생했습니다: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return { exportPdf, exportSplitFilesToLocal };
}
