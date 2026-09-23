/**
 * 모델 가공 외곽 치수(Bounding Box) 및 부품 정보 배너 컴포넌트
 */
import React from 'react';
import { Box, Layers, Hash } from 'lucide-react';
import type { ModelMetadata, CadUnit, BoundingBoxMode } from './types';

interface CadDimensionsBannerProps {
  metadata: ModelMetadata | null;
  unit: CadUnit;
  onUnitChange?: (unit: CadUnit) => void;
  boundingBoxMode?: BoundingBoxMode;
  onBoundingBoxModeChange?: (mode: BoundingBoxMode) => void;
  className?: string;
}

export const CadDimensionsBanner: React.FC<CadDimensionsBannerProps> = ({
  metadata,
  unit,
  onUnitChange,
  boundingBoxMode = 'none',
  onBoundingBoxModeChange,
  className = '',
}) => {
  if (!metadata) return null;

  const isInch = unit === 'in';
  const scale = isInch ? 1 / 25.4 : 1.0;
  const digits = isInch ? 2 : 1;

  // 1. AABB 치수 (XYZ 기준)
  const [rawX, rawY, rawZ] = metadata.boundingBox.size;
  const aabbX = rawX * scale;
  const aabbY = rawY * scale;
  const aabbZ = rawZ * scale;

  // 2. OBB 치수 (최소 사이즈 기준)
  const obb = metadata.obb;
  const isObbActive = boundingBoxMode === 'obb' && !!obb;
  const obbSize = obb ? obb.size.map((s) => s * scale) : null;

  const displayX = isObbActive && obbSize ? obbSize[0] : aabbX;
  const displayY = isObbActive && obbSize ? obbSize[1] : aabbY;
  const displayZ = isObbActive && obbSize ? obbSize[2] : aabbZ;
  const labelPrefix = isObbActive ? '최소 가공 소재:' : '가공 소재 치수:';
  const themeColor = isObbActive ? 'text-amber-400' : 'text-cyan-400';

  return (
    <div className={`flex items-center gap-3 px-3.5 py-1.5 bg-bg-surface/90 border border-border-default rounded-xl shadow-smooth backdrop-blur-md text-xs text-text-secondary select-none ${className}`}>
      {/* 바운딩 박스 가공 소재 치수 */}
      <div className="flex items-center gap-2">
        <Box className={`w-3.5 h-3.5 ${themeColor} shrink-0`} />

        {/* 바운딩 박스 모드 전환 탭 [XYZ | 최소] */}
        {onBoundingBoxModeChange && (
          <div className="flex items-center bg-bg-base rounded-md p-0.5 border border-border-subtle text-[10px]">
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

        <span className="text-text-muted font-medium">{labelPrefix}</span>
        <div className="flex items-center gap-1 font-mono font-semibold text-text-primary">
          <span className={themeColor}>
            {isObbActive ? 'L: ' : 'X: '}
            {displayX.toFixed(digits)}
          </span>
          <span className="text-text-muted">×</span>
          <span className={themeColor}>
            {isObbActive ? 'W: ' : 'Y: '}
            {displayY.toFixed(digits)}
          </span>
          <span className="text-text-muted">×</span>
          <span className={themeColor}>
            {isObbActive ? 'H: ' : 'Z: '}
            {displayZ.toFixed(digits)}
          </span>
          <span className={`${themeColor} font-bold ml-0.5`}>{unit}</span>
        </div>

        {/* OBB 부피 절감 배지 */}
        {isObbActive && obb && obb.volumeSavingsPercent > 0 && (
          <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded font-mono font-bold">
            체적 {obb.volumeSavingsPercent}% 절감 ✨
          </span>
        )}

        {/* 자동 감지 배지 */}
        {metadata.detectedUnit && (
          <span className="text-[10px] px-1.5 py-0.2 bg-brand-500/15 text-brand-400 border border-brand-500/30 rounded font-mono">
            {metadata.detectedUnit === 'in' ? 'INCH 자동감지' : 'MM 자동감지'}
          </span>
        )}
      </div>

      <div className="w-[1px] h-3.5 bg-border-default" />

      {/* 부품 및 폴리곤 정보 */}
      <div className="flex items-center gap-3 text-[11px] text-text-muted">
        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>부품: <strong className="text-text-secondary font-mono">{metadata.meshCount}</strong>개</span>
        </div>
        <div className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          <span>삼각망: <strong className="text-text-secondary font-mono">{metadata.triangleCount.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* 수동 단위 전환 스위치 [mm | in] */}
      {onUnitChange && (
        <>
          <div className="w-[1px] h-3.5 bg-border-default" />
          <div className="flex items-center bg-bg-base rounded-lg p-0.5 border border-border-subtle font-mono text-[11px]">
            <button
              onClick={() => onUnitChange('mm')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                unit === 'mm'
                  ? 'bg-brand-500 text-white font-bold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="밀리미터(mm) 단위로 표시"
            >
              mm
            </button>
            <button
              onClick={() => onUnitChange('in')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                unit === 'in'
                  ? 'bg-brand-500 text-white font-bold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="인치(in) 단위로 표시"
            >
              in
            </button>
          </div>
        </>
      )}
    </div>
  );
};
