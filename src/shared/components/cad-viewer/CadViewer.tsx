/**
 * MiniPDM 공용 3D CAD 뷰어 메인 컴포넌트
 * (통합 상단 헤더 - 3D 캔버스 - 통합 하단 상태바 3단 워크스테이션 레이아웃)
 */
import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { CadViewerProps, RenderMode, ViewPreset, OrbitMode, CadUnit, BoundingBoxMode, SnapElement } from './types';
import { useStepLoader } from './hooks/useStepLoader';
import { CadCanvas } from './CadCanvas';
import { CadToolbar } from './CadToolbar';
import { CadStatusBar } from './CadStatusBar';
import { calculateBoundingBoxes } from './geometry/BoundingBoxCalculator';

export const CadViewer: React.FC<CadViewerProps> = ({
  file,
  fileName = 'model.stp',
  isModal = false,
  onClose,
  initialRenderMode = 'edges',
  initialOrbitMode = 'free',
  showDimensionsBanner = true,
  showGrid = false,
  onMeasurementsChange,
  onBoundingBoxCalculated,
  onApplyDimensions,
  className = '',
}) => {
  // 로더 훅
  const { isLoading, progressText, error, parsedResult, reload } = useStepLoader(file, fileName);

  // 뷰어 제어 상태
  const [renderMode, setRenderMode] = useState<RenderMode>(initialRenderMode);
  const [viewPreset, setViewPreset] = useState<ViewPreset | null>('iso');
  const [orbitMode, setOrbitMode] = useState<OrbitMode>(initialOrbitMode); // 🌟 360도 자유 궤도 vs 턴테이블
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [isMeasureMode, setIsMeasureMode] = useState<boolean>(false);
  const [selectedA, setSelectedA] = useState<SnapElement | null>(null);
  const [boundingBoxMode, setBoundingBoxMode] = useState<BoundingBoxMode>('none');

  // 치수 단위 상태 ('mm' 또는 'in', 파일에서 자동 감지된 단위로 자동 세팅됨)
  const [unit, setUnit] = useState<CadUnit>('mm');

  // 단면 절단 상태
  const [isClippingActive, setIsClippingActive] = useState<boolean>(false);
  const [clipAxis, setClipAxis] = useState<'x' | 'y' | 'z'>('z');
  const [clipOffset, setClipOffset] = useState<number>(0);

  // 메쉬 정점 기반 AABB 및 최소 사이즈 OBB 계산
  const boundingBoxes = React.useMemo(() => {
    if (!parsedResult?.meshes || parsedResult.meshes.length === 0) return null;
    return calculateBoundingBoxes(parsedResult.meshes, parsedResult.detectedCircles || []);
  }, [parsedResult?.meshes, parsedResult?.detectedCircles]);

  // 메타데이터에 OBB 및 형상 판정(원형 vs 사각) 정보 실시간 반영
  const effectiveMetadata = React.useMemo(() => {
    if (!parsedResult?.metadata) return null;
    return {
      ...parsedResult.metadata,
      obb: boundingBoxes?.obb || undefined,
      shapeClassification: boundingBoxes?.shape || undefined,
    };
  }, [parsedResult?.metadata, boundingBoxes?.obb, boundingBoxes?.shape]);

  // 바운딩 박스 계산 완료 시 부모 컴포넌트(MiniPDM 견적/발주 폼)로 콜백 통지
  useEffect(() => {
    if (parsedResult && boundingBoxes && onBoundingBoxCalculated) {
      onBoundingBoxCalculated({
        fileName,
        fileSizeBytes: parsedResult.metadata.fileSizeBytes || 0,
        detectedUnit: parsedResult.metadata.detectedUnit || 'mm',
        unit,
        meshCount: parsedResult.metadata.meshCount || parsedResult.meshes.length,
        triangleCount: parsedResult.metadata.triangleCount || 0,
        aabb: boundingBoxes.aabb,
        obb: boundingBoxes.obb,
        shapeClassification: boundingBoxes.shape,
        executionTimeMs: 0,
      });
    }
  }, [parsedResult, boundingBoxes, onBoundingBoxCalculated, fileName, unit]);

  // 모델 로드 시 원본 설계 단위 자동 감지 동기화
  useEffect(() => {
    if (parsedResult?.metadata?.detectedUnit) {
      setUnit(parsedResult.metadata.detectedUnit);
    }
  }, [parsedResult?.metadata?.detectedUnit]);

  // 뷰 프리셋 변경
  const handleViewPreset = (preset: ViewPreset) => {
    setViewPreset(preset);
    setResetTrigger((prev) => prev + 1);
  };

  // 카메라 초기화
  const handleResetCamera = () => {
    setViewPreset('iso');
    setResetTrigger((prev) => prev + 1);
  };

  // 뷰어 본체 컨텐츠 (통합 헤더 - 메인 캔버스 - 통합 상태바)
  const viewerContent = (
    <div className={`relative w-full h-full bg-bg-base overflow-hidden flex flex-col select-none ${className}`}>
      {/* 1. 상단 통합 헤더 및 툴바 (단면 절단 서브바 포함) */}
      <CadToolbar
        fileName={fileName}
        renderMode={renderMode}
        onRenderModeChange={setRenderMode}
        onViewPreset={handleViewPreset}
        onResetCamera={handleResetCamera}
        orbitMode={orbitMode}
        onOrbitModeChange={setOrbitMode}
        boundingBoxMode={boundingBoxMode}
        onBoundingBoxModeChange={setBoundingBoxMode}
        isMeasureMode={isMeasureMode}
        onToggleMeasureMode={() => setIsMeasureMode((prev) => !prev)}
        isClippingActive={isClippingActive}
        onToggleClipping={() => setIsClippingActive((prev) => !prev)}
        clipAxis={clipAxis}
        onClipAxisChange={setClipAxis}
        clipOffset={clipOffset}
        onClipOffsetChange={setClipOffset}
        onClose={onClose}
      />

      {/* 2. 순수 3D 메인 캔버스 영역 (캔버스를 가리는 플로팅 툴바 없음) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {parsedResult && parsedResult.meshes && parsedResult.metadata && (
          <CadCanvas
            meshes={parsedResult.meshes}
            detectedCircles={parsedResult.detectedCircles || []}
            boundingBox={parsedResult.metadata.boundingBox}
            obb={boundingBoxes?.obb}
            boundingBoxMode={boundingBoxMode}
            renderMode={renderMode}
            viewPreset={viewPreset}
            orbitMode={orbitMode}
            resetTrigger={resetTrigger}
            isMeasureMode={isMeasureMode}
            isClippingActive={isClippingActive}
            clipAxis={clipAxis}
            clipOffset={clipOffset}
            unit={unit}
            onUnitChange={setUnit}
            onMeasurementsChange={onMeasurementsChange}
            showGrid={showGrid}
            onSelectedAChange={setSelectedA}
          />
        )}

        {/* 2-1. 로딩 상태 스피너 오버레이 */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-bg-base/85 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">3D CAD 모델 불러오는 중...</p>
            <p className="text-xs text-text-secondary font-mono">{progressText}</p>
          </div>
        )}

        {/* 2-2. 에러 발생 안내 오버레이 */}
        {error && !isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-bg-base/90 p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-danger mb-3" />
            <h4 className="text-base font-bold text-text-primary mb-1">STP 파일을 열 수 없습니다</h4>
            <p className="text-xs text-text-secondary max-w-md mb-4 break-words font-mono bg-bg-surface p-3 rounded-lg border border-border-default">
              {error}
            </p>
            <button
              onClick={reload}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg shadow-smooth transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              다시 시도
            </button>
          </div>
        )}
      </div>

      {/* 3. 하단 통합 상태바 (가공 소재 치수 + 실시간 가이드 + 조작 단축키) */}
      {showDimensionsBanner && (
        <CadStatusBar
          metadata={effectiveMetadata}
          unit={unit}
          onUnitChange={setUnit}
          boundingBoxMode={boundingBoxMode}
          onBoundingBoxModeChange={setBoundingBoxMode}
          onApplyDimensions={onApplyDimensions}
          isMeasureMode={isMeasureMode}
          selectedA={selectedA}
          isClippingActive={isClippingActive}
          orbitMode={orbitMode}
        />
      )}
    </div>
  );

  // 모달 모드인 경우 널찍한 백드롭과 라운드 컨테이너로 감싸기
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
        <div className="relative w-full h-full max-w-[96vw] max-h-[94vh] bg-bg-base border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {viewerContent}
        </div>
      </div>
    );
  }

  // 인라인 모드인 경우 그대로 반환
  return viewerContent;
};
