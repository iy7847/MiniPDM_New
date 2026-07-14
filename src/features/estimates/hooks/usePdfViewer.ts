import { useState, useRef, useEffect } from 'react';

export function usePdfViewer(
  file: File | null,
  pageNumber: number,
  setPageNumber: React.Dispatch<React.SetStateAction<number>>,
  numPages: number,
  scale: number,
  setScale: React.Dispatch<React.SetStateAction<number>>,
  setOcrMode: React.Dispatch<React.SetStateAction<'part_no' | 'part_name' | 'material'>>,
  setIsMaskMode: React.Dispatch<React.SetStateAction<boolean>>,
  masks: any[],
  setMasks: React.Dispatch<React.SetStateAction<any[]>>,
  isMaskMode: boolean,
  runOCR: (rect: any) => Promise<void>,
  RENDER_WIDTH: number
) {
  const [selection, setSelection] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [wrapperHeight, setWrapperHeight] = useState<number>(0);

  const panStartRef = useRef({ x: 0, y: 0 });
  const pdfWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 우측 하단 앵커 거리 상태
  const anchorRef = useRef<{ right: number; bottom: number } | null>(null);

  const saveAnchor = () => {
    const container = scrollContainerRef.current;
    if (container && wrapperHeight > 0) {
      const contentWidth = RENDER_WIDTH * scale;
      const contentHeight = wrapperHeight * scale;
      const rightDistance = contentWidth - (container.scrollLeft + container.clientWidth);
      const bottomDistance = contentHeight - (container.scrollTop + container.clientHeight);
      anchorRef.current = { right: rightDistance, bottom: bottomDistance };
    }
  };

  const restoreAnchor = () => {
    const container = scrollContainerRef.current;
    if (container && anchorRef.current && wrapperHeight > 0) {
      const contentWidth = RENDER_WIDTH * scale;
      const contentHeight = wrapperHeight * scale;
      container.scrollLeft = contentWidth - container.clientWidth - anchorRef.current.right;
      container.scrollTop = contentHeight - container.clientHeight - anchorRef.current.bottom;
    }
  };

  // wrapperHeight가 변경될 때마다(즉, 페이지가 새로 로드되었을 때) 앵커 복원
  useEffect(() => {
    restoreAnchor();
  }, [wrapperHeight]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      if (e.key === 'ArrowLeft') {
        changePage(-1);
      } else if (e.key === 'ArrowRight') {
        changePage(1);
      } else if (e.key === '1') {
        setIsMaskMode(prev => !prev);
      } else if (e.key === '2') {
        setIsMaskMode(false);
        setOcrMode('part_no');
      } else if (e.key === '3') {
        setIsMaskMode(false);
        setOcrMode('part_name');
      } else if (e.key === '4') {
        setIsMaskMode(false);
        setOcrMode('material');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages, wrapperHeight]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newScale = Math.min(Math.max(scale + delta, 0.1), 2.0);
        
        // 확대/축소 시에도 우측 하단을 앵커로 유지하도록 거리 계산 후 적용
        if (wrapperHeight > 0) {
          const contentWidth = RENDER_WIDTH * scale;
          const contentHeight = wrapperHeight * scale;
          const rightDistance = contentWidth - (container.scrollLeft + container.clientWidth);
          const bottomDistance = contentHeight - (container.scrollTop + container.clientHeight);
          
          const ratioRight = rightDistance / scale;
          const ratioBottom = bottomDistance / scale;
          
          setScale(newScale);
          
          // scale은 React state이므로 setTimeout으로 적용 대기 후 스크롤
          setTimeout(() => {
            const newContentWidth = RENDER_WIDTH * newScale;
            const newContentHeight = wrapperHeight * newScale;
            container.scrollLeft = newContentWidth - container.clientWidth - (ratioRight * newScale);
            container.scrollTop = newContentHeight - container.clientHeight - (ratioBottom * newScale);
            
            // 확대축소 후 앵커 갱신
            anchorRef.current = { right: ratioRight * newScale, bottom: ratioBottom * newScale };
          }, 0);
        } else {
          setScale(newScale);
        }
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [scale, file, wrapperHeight]);

  const changePage = (offset: number) => {
    saveAnchor();
    setPageNumber(prevPage => Math.min(Math.max(prevPage + offset, 1), numPages));
    setSelection({ x: 0, y: 0, w: 0, h: 0 });
    setOcrMode('part_no');
  };

  const jumpToPage = (page: number) => {
    saveAnchor();
    setPageNumber(page);
    setOcrMode('part_no');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 2) {
      e.preventDefault();
      setOcrMode(prev => prev === 'part_no' ? 'part_name' : prev === 'part_name' ? 'material' : 'part_no');
      return;
    }

    if (e.button === 0) {
      if (!pdfWrapperRef.current) return;
      const rect = pdfWrapperRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      setStartPos({ x, y });
      setIsSelecting(true);
      setSelection({ x, y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && scrollContainerRef.current) {
      e.preventDefault();
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      scrollContainerRef.current.scrollLeft -= dx;
      scrollContainerRef.current.scrollTop -= dy;
      
      // 팬 이동 후 앵커 위치 재저장
      saveAnchor();

      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isSelecting && pdfWrapperRef.current) {
      const rect = pdfWrapperRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / scale;
      const currentY = (e.clientY - rect.top) / scale;

      setSelection({
        x: Math.min(startPos.x, currentX),
        y: Math.min(startPos.y, currentY),
        w: Math.abs(currentX - startPos.x),
        h: Math.abs(currentY - startPos.y),
      });
    }
  };

  const handleMouseUp = async () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isSelecting) {
      setIsSelecting(false);
      if (selection.w > 10 && selection.h > 10) {
        if (isMaskMode) {
          setMasks(prev => [...prev, { page: pageNumber, ...selection }]);
          setSelection({ x: 0, y: 0, w: 0, h: 0 });
        } else {
          await runOCR(selection);
        }
      }
    }
  };

  return {
    selection,
    isPanning,
    wrapperHeight,
    setWrapperHeight,
    pdfWrapperRef,
    scrollContainerRef,
    changePage,
    jumpToPage,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
}
