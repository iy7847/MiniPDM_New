/**
 * MiniPDM 3D CAD 뷰어 하단 통합 상태바 (Status Bar)
 * (가공 소재 치수, 실시간 가이드, 마우스 조작 단축 안내를 하나의 일체형 바로 제공)
 */
import React from 'react';
import { Box, Layers, Hash, Sparkles, Check } from 'lucide-react';
import type { ModelMetadata, CadUnit, BoundingBoxMode, SnapElement, AppliedDimensions, OrbitMode } from './types';

interface CadStatusBarProps {
  metadata: ModelMetadata | null;
  unit: CadUnit;
  onUnitChange?: (unit: CadUnit) => void;
  boundingBoxMode?: BoundingBoxMode;
  onBoundingBoxModeChange?: (mode: BoundingBoxMode) => void;
  onApplyDimensions?: (dimensions: AppliedDimensions) => void;

  // 인터랙션 상태
  isMeasureMode: boolean;
  selectedA: SnapElement | null;
  isClippingActive: boolean;
  orbitMode?: OrbitMode;

  className?: string;
}

export const CadStatusBar: React.FC<CadStatusBarProps> = ({
  metadata,
  unit,
  onUnitChange,
  boundingBoxMode = 'none',
  onBoundingBoxModeChange,
  onApplyDimensions,
  isMeasureMode,
  selectedA,
  isClippingActive,
  orbitMode = 'free',
  className = '',
}) => {
  const [isApplied, setIsApplied] = React.useState(false);

  const isInch = unit === 'in';
  const scale = isInch ? 1 / 25.4 : 1.0;
  const digits = isInch ? 2 : 1;

  // 1. 치수 계산
  const [rawX, rawY, rawZ] = metadata ? metadata.boundingBox.size : [0, 0, 0];
  const aabbX = rawX * scale;
  const aabbY = rawY * scale;
  const aabbZ = rawZ * scale;

  const obb = metadata?.obb;
  const isObbActive = boundingBoxMode === 'obb' && !!obb;
  const obbSize = obb ? obb.size.map((s) => s * scale) : null;

  const displayX = isObbActive && obbSize ? obbSize[0] : aabbX;
  const displayY = isObbActive && obbSize ? obbSize[1] : aabbY;
  const displayZ = isObbActive && obbSize ? obbSize[2] : aabbZ;
  const themeColor = isObbActive ? 'text-amber-400' : 'text-cyan-400';

  const handleApplyDimensions = () => {
    if (!metadata || !onApplyDimensions) return;

    const isRound = metadata.shapeClassification?.shapeType === 'round';
    let spec_w = 0;
    let spec_d = 0;
    let spec_h = 0;
    let raw_w = 0;
    let raw_d = 0;
    let raw_h = 0;
    let shape: 'rect' | 'round' = 'rect';

    if (isRound && metadata.shapeClassification?.recommendation) {
      const rec = metadata.shapeClassification.recommendation;
      const dia = Math.round((rec.diameter || displayX) * scale * 10) / 10;
      const len = Math.round((rec.length || displayZ) * scale * 10) / 10;

      shape = 'round';
      spec_w = dia;
      spec_d = len;
      spec_h = 0;
      raw_w = dia;
      raw_d = len;
      raw_h = 0;
    } else {
      const w = Math.round(displayX * 10) / 10;
      const d = Math.round(displayY * 10) / 10;
      const h = Math.round(displayZ * 10) / 10;

      shape = 'rect';
      spec_w = w;
      spec_d = d;
      spec_h = h;
      raw_w = w;
      raw_d = d;
      raw_h = h;
    }

    onApplyDimensions({
      spec_w,
      spec_d,
      spec_h,
      raw_w,
      raw_d,
      raw_h,
      shape,
      unit,
    });

    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 2000);
  };

  return (
    <footer className={`w-full h-9 bg-bg-surface border-t border-border-default px-3 sm:px-4 flex items-center justify-between text-xs text-text-secondary select-none shrink-0 z-30 ${className}`}>
      {/* [좌측] 가공 소재 외곽 치수 & 단위 스위치 */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
        <Box className={`w-3.5 h-3.5 ${themeColor} shrink-0`} />

        {/* 바운딩 박스 모드 전환 [XYZ | 최소] */}
        {onBoundingBoxModeChange && (
          <div className="flex items-center bg-bg-base rounded p-0.5 border border-border-subtle text-[10px] shrink-0">
            <button
              onClick={() => onBoundingBoxModeChange(boundingBoxMode === 'aabb' ? 'none' : 'aabb')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                boundingBoxMode === 'aabb'
                  ? 'bg-cyan-500 text-white font-bold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="3D 화면에 XYZ 축 정렬 바운딩 박스(AABB) 표시"
            >
              XYZ
            </button>
            {obb && (
              <button
                onClick={() => onBoundingBoxModeChange(boundingBoxMode === 'obb' ? 'none' : 'obb')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  boundingBoxMode === 'obb'
                    ? 'bg-amber-500 text-white font-bold shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="3D 화면에 최소 체적 가공 소재 바운딩 박스(OBB) 표시"
              >
                최소
              </button>
            )}
          </div>
        )}

        {/* 소재 치수 수치 */}
        {metadata && (
          <div className="flex items-center gap-1 font-mono text-[11px] sm:text-xs font-semibold text-text-primary shrink-0">
            <span className="text-text-muted font-normal hidden md:inline">
              {isObbActive ? '최소소재:' : '가공소재:'}
            </span>
            <span className={themeColor}>
              {isObbActive ? 'L:' : 'X:'}{displayX.toFixed(digits)}
            </span>
            <span className="text-text-muted">×</span>
            <span className={themeColor}>
              {isObbActive ? 'W:' : 'Y:'}{displayY.toFixed(digits)}
            </span>
            <span className="text-text-muted">×</span>
            <span className={themeColor}>
              {isObbActive ? 'H:' : 'Z:'}{displayZ.toFixed(digits)}
            </span>
            <span className={`${themeColor} font-bold ml-0.5`}>{unit}</span>
          </div>
        )}

        {/* 소재 형상 판정 뱃지 [환봉 Ø... | 각재] */}
        {metadata?.shapeClassification && (
          <div
            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 border transition-all cursor-help ${
              metadata.shapeClassification.shapeType === 'round'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-blue-500/15 text-blue-300 border-blue-500/40'
            }`}
            title={`소재 판정: ${metadata.shapeClassification.recommendation.label}\n근거: ${metadata.shapeClassification.details.reason} (신뢰도 ${Math.round(metadata.shapeClassification.confidence * 100)}%)`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>
              {metadata.shapeClassification.shapeType === 'round'
                ? `환봉: Ø${(metadata.shapeClassification.recommendation.diameter! * scale).toFixed(digits)}`
                : '각재'}
            </span>
          </div>
        )}

        {/* OBB 부피 절감 배지 */}
        {isObbActive && obb && obb.volumeSavingsPercent > 0 && (
          <span className="hidden lg:inline-block text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded font-mono font-bold shrink-0">
            절감 {obb.volumeSavingsPercent}% ✨
          </span>
        )}

        {/* 단위 전환 스위치 [mm | in] */}
        {onUnitChange && (
          <div className="flex items-center bg-bg-base rounded p-0.5 border border-border-subtle font-mono text-[10px] shrink-0">
            <button
              onClick={() => onUnitChange('mm')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                unit === 'mm'
                  ? 'bg-brand-500 text-white font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              mm
            </button>
            <button
              onClick={() => onUnitChange('in')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                unit === 'in'
                  ? 'bg-brand-500 text-white font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              in
            </button>
          </div>
        )}

        {/* ✨ 견적/수주 폼으로 가공/원소재 치수 즉시 적용 버튼 */}
        {onApplyDimensions && metadata && (
          <button
            type="button"
            onClick={handleApplyDimensions}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[11px] shadow-sm transition-all active:scale-95 shrink-0 ${
              isApplied
                ? 'bg-emerald-600 text-white'
                : 'bg-brand-500 hover:bg-brand-600 text-white'
            }`}
            title="현재 3D CAD 가공 치수를 견적/수주 폼에 즉시 적용합니다"
          >
            {isApplied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>적용 완료!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>치수 적용</span>
              </>
            )}
          </button>
        )}

        {/* 부품 및 삼각망 요약 */}
        {metadata && (
          <div className="hidden xl:flex items-center gap-2 text-[11px] text-text-muted border-l border-border-default pl-2 shrink-0">
            <span>부품 <strong className="text-text-secondary font-mono">{metadata.meshCount}</strong>개</span>
            <span>•</span>
            <span>삼각망 <strong className="text-text-secondary font-mono">{metadata.triangleCount.toLocaleString()}</strong></span>
          </div>
        )}
      </div>

      {/* [중앙] 실시간 인터랙션 동적 안내 (겹침 0% 보장) */}
      <div className="hidden md:flex items-center justify-center flex-1 px-3 text-center truncate">
        {isMeasureMode ? (
          selectedA ? (
            <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-success animate-ping shrink-0" />
              <span>
                1번 선택됨 (<strong className="text-brand-400">{selectedA.description || '요소'}</strong>) ➔{' '}
                <strong className="text-brand-300">2번째 측정 대상</strong>을 클릭하세요
              </span>
              <span className="text-[10px] text-text-muted font-normal ml-1">
                (취소: <kbd className="px-1 bg-bg-elevated rounded border border-border-default font-mono">ESC</kbd>)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-brand-300 font-medium animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse shrink-0" />
              <span>측정할 홀, 모서리 선, 평면, 꼭짓점을 좌클릭하세요</span>
            </div>
          )
        ) : isClippingActive ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span>상단 슬라이더로 절단면 위치를 조절하세요</span>
          </div>
        ) : null}
      </div>

      {/* [우측] 마우스 조작 단축키 안내 */}
      <div className="flex items-center gap-2 text-[11px] text-text-muted shrink-0">
        {isMeasureMode ? (
          <>
            <span className="text-brand-400 font-medium">좌클릭: 측정</span>
            <span>•</span>
            <span>휠 드래그: 이동</span>
            <span>•</span>
            <span>빈 화면: 취소</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">
              {orbitMode === 'free' ? '좌클릭 드래그: 360° 자유 회전' : '좌클릭 드래그: 회전'}
            </span>
            <span className="hidden sm:inline">•</span>
            <span>휠 드래그: 이동</span>
            <span>•</span>
            <span>휠: 줌</span>
          </>
        )}
      </div>
    </footer>
  );
};
