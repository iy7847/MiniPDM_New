/**
 * 2D 스크린 오버레이 치수 라벨 및 스냅 툴팁 컴포넌트
 */
import React from 'react';
import * as THREE from 'three';
import { X, Ruler } from 'lucide-react';
import type { MeasurementItem, SnapElement, CadUnit } from '../types';
import { InventorMeasurePanel } from './InventorMeasurePanel';

interface DimensionOverlayProps {
  measurements: MeasurementItem[];
  hoverSnap: SnapElement | null;
  selectedA: SnapElement | null;
  camera: THREE.Camera | null;
  canvasRect: DOMRect | null;
  isMeasureMode: boolean;
  unit?: CadUnit;
  onUnitChange?: (unit: CadUnit) => void;
  onRemoveMeasurement: (id: string) => void;
  onClearAll: () => void;
  onUpdateCircleOption?: (id: string, option: 'center' | 'min' | 'max') => void;
}

export const DimensionOverlay: React.FC<DimensionOverlayProps> = ({
  measurements,
  hoverSnap,
  selectedA,
  camera,
  canvasRect,
  isMeasureMode,
  unit = 'mm',
  onUnitChange,
  onRemoveMeasurement,
  onClearAll,
  onUpdateCircleOption,
}) => {
  if (!camera || !canvasRect) return null;

  // 3D 월드 좌표를 2D 화면 픽셀 좌표로 변환하는 헬퍼 함수
  const getScreenPos = (worldPos: [number, number, number]) => {
    const v = new THREE.Vector3(...worldPos);
    v.project(camera);

    // 카메라 뒷면에 있는 경우 클리핑
    if (v.z > 1) return null;

    const x = ((v.x + 1) * canvasRect.width) / 2;
    const y = ((-v.y + 1) * canvasRect.height) / 2;
    return { x, y };
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* 1. 마우스 호버 스냅 툴팁 힌트 (단위 자동 변환 적용) */}
      {isMeasureMode && hoverSnap && !selectedA && (
        (() => {
          const pos = getScreenPos(hoverSnap.point);
          if (!pos) return null;

          let desc = hoverSnap.description || '선택';
          if (unit === 'in') {
            if (hoverSnap.type === 'edge' && hoverSnap.length !== undefined) {
              desc = `모서리 선 (길이: ${(hoverSnap.length / 25.4).toFixed(2)} in)`;
            } else if (hoverSnap.type === 'circle' && hoverSnap.diameter !== undefined && hoverSnap.radius !== undefined) {
              const prefix = hoverSnap.isCylinderFace ? '원통 곡면' : '원형 홀';
              desc = `${prefix} (Ø ${(hoverSnap.diameter / 25.4).toFixed(2)} in, R ${(hoverSnap.radius / 25.4).toFixed(2)} in)`;
            } else if (hoverSnap.type === 'vertex') {
              const [vx, vy, vz] = hoverSnap.point;
              desc = `꼭짓점 (${(vx / 25.4).toFixed(2)}, ${(vy / 25.4).toFixed(2)}, ${(vz / 25.4).toFixed(2)})`;
            }
          }

          return (
            <div
              className="absolute z-20 px-2.5 py-1 text-xs rounded-md bg-bg-surface/95 border border-brand-500/50 text-brand-400 font-medium shadow-lg backdrop-blur-sm -translate-x-1/2 -translate-y-9 pointer-events-none transition-transform"
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            >
              {desc}
            </div>
          );
        })()
      )}

      {/* 2. 첫 번째 요소 선택 완료 후 안내 배너 */}
      {isMeasureMode && selectedA && (
        (() => {
          const pos = getScreenPos(selectedA.point);
          if (!pos) return null;
          return (
            <div
              className="absolute z-20 px-3 py-1.5 text-xs rounded-lg bg-success/20 border border-success text-success font-semibold shadow-lg backdrop-blur-sm -translate-x-1/2 -translate-y-11 pointer-events-none animate-pulse"
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            >
              1번 기준점 선택됨 (다음 요소를 클릭하여 거리 측정)
            </div>
          );
        })()
      )}

      {/* 3. 확정된 치수 라벨 뱃지 목록 */}
      {measurements.map((m) => {
        // 치수선의 중간 지점에 라벨 표시
        const midPoint: [number, number, number] = [
          (m.startPoint[0] + m.endPoint[0]) / 2,
          (m.startPoint[1] + m.endPoint[1]) / 2,
          (m.startPoint[2] + m.endPoint[2]) / 2,
        ];

        const pos = getScreenPos(midPoint);
        if (!pos) return null;

        const isInch = unit === 'in';
        const displayLabel = isInch
          ? `${m.type === 'hole' ? 'Ø ' : ''}${(m.value / 25.4).toFixed(2)} in`
          : m.label;
        const subLabel = isInch ? `${m.value.toFixed(1)} mm` : `${(m.value / 25.4).toFixed(2)} in`;

        return (
          <div
            key={m.id}
            className="absolute z-30 pointer-events-auto -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface/90 hover:bg-bg-elevated border border-brand-500/70 hover:border-brand-400 rounded-lg shadow-smooth text-xs text-text-primary backdrop-blur-md transition-all">
              <Ruler className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="font-bold tracking-wide text-brand-400 font-mono">
                {displayLabel}
              </span>
              <span className="text-[10px] text-text-muted font-mono">
                ({subLabel})
              </span>

              {/* 삭제 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveMeasurement(m.id);
                }}
                className="ml-1 p-0.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                title="치수 삭제"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* 축별 델타 (ΔX, ΔY, ΔZ) 상세 툴팁 (호버 시 표시) */}
            {m.details && (
              <div className="hidden group-hover:flex flex-col gap-0.5 mt-1 px-2.5 py-1.5 bg-bg-overlay border border-border-default rounded text-[11px] text-text-secondary font-mono shadow-md whitespace-nowrap">
                {m.details.dx !== undefined && (
                  <span>
                    ΔX: {isInch ? (m.details.dx / 25.4).toFixed(2) : m.details.dx.toFixed(2)} {unit}
                  </span>
                )}
                {m.details.dy !== undefined && (
                  <span>
                    ΔY: {isInch ? (m.details.dy / 25.4).toFixed(2) : m.details.dy.toFixed(2)} {unit}
                  </span>
                )}
                {m.details.dz !== undefined && (
                  <span>
                    ΔZ: {isInch ? (m.details.dz / 25.4).toFixed(2) : m.details.dz.toFixed(2)} {unit}
                  </span>
                )}
                {m.details.innerDist !== undefined && (
                  <span>
                    안쪽 최소: {isInch ? (m.details.innerDist / 25.4).toFixed(2) : m.details.innerDist.toFixed(2)} {unit}
                  </span>
                )}
                {m.details.outerDist !== undefined && (
                  <span>
                    바깥쪽 최대: {isInch ? (m.details.outerDist / 25.4).toFixed(2) : m.details.outerDist.toFixed(2)} {unit}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 4. 오토데스크 인벤터 스타일 플로팅 측정 HUD 패널 */}
      {isMeasureMode && (
        <InventorMeasurePanel
          measurements={measurements}
          selectedA={selectedA}
          unit={unit}
          onUnitChange={onUnitChange}
          onRemoveMeasurement={onRemoveMeasurement}
          onClearAll={onClearAll}
          onUpdateCircleOption={onUpdateCircleOption}
        />
      )}
    </div>
  );
};
