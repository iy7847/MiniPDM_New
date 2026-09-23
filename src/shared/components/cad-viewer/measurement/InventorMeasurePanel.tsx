/**
 * 오토데스크 인벤터(Autodesk Inventor) 스타일 플로팅 측정 패널 (Measure HUD)
 */
import React, { useState } from 'react';
import {
  Ruler,
  Copy,
  Check,
  Trash2,
  Circle,
  Square,
  Minus,
  Dot,
  Layers,
  Compass,
} from 'lucide-react';
import type { MeasurementItem, SnapElement, CadUnit } from '../types';

interface InventorMeasurePanelProps {
  measurements: MeasurementItem[];
  selectedA: SnapElement | null;
  unit?: CadUnit;
  onUnitChange?: (unit: CadUnit) => void;
  onRemoveMeasurement: (id: string) => void;
  onClearAll: () => void;
  onUpdateCircleOption?: (id: string, option: 'center' | 'min' | 'max') => void;
}

export const InventorMeasurePanel: React.FC<InventorMeasurePanelProps> = ({
  measurements,
  selectedA,
  unit = 'mm',
  onUnitChange,
  onRemoveMeasurement,
  onClearAll,
  onUpdateCircleOption,
}) => {
  // 현재 활성화된 측정 인덱스 (기본: 가장 최근 측정값)
  const [activeIdx, setActiveIdx] = useState<number>(measurements.length - 1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const prevLenRef = React.useRef(measurements.length);

  // 측정값이 새로 "추가"되었을 때만 자동으로 최신 측정값 탭으로 포커스
  // 항목이 삭제된 경우에는 현재 인덱스를 최대한 보존하며 범위를 초과하지 않도록 보정
  React.useEffect(() => {
    if (measurements.length > prevLenRef.current) {
      // 새 측정값 추가됨 -> 최신 탭으로 이동
      setActiveIdx(measurements.length - 1);
    } else if (activeIdx >= measurements.length) {
      // 삭제되어 현재 인덱스가 범위를 벗어남 -> 마지막 유효 인덱스로 보정
      setActiveIdx(Math.max(0, measurements.length - 1));
    }
    prevLenRef.current = measurements.length;
  }, [measurements.length, activeIdx]);

  const currentIdx = Math.max(0, Math.min(activeIdx, measurements.length - 1));
  const currentMeasure = measurements[currentIdx];

  const isInch = unit === 'in';
  const scale = isInch ? 1 / 25.4 : 1.0;
  const digits = isInch ? 3 : 2;

  const formatDist = (val?: number) => {
    if (val === undefined) return '0.00';
    return (val * scale).toFixed(digits);
  };

  const formatSubDist = (val?: number) => {
    if (val === undefined) return '';
    return isInch
      ? `${val.toFixed(2)} mm`
      : `${(val / 25.4).toFixed(3)} in`;
  };

  // 클립보드 복사 헬퍼
  const handleCopy = (val: string | number, key: string) => {
    navigator.clipboard.writeText(String(val));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // 요소 타입별 인벤터 아이콘 반환
  const getElementIcon = (type?: string, isCylinderFace?: boolean) => {
    if (isCylinderFace) {
      return <Circle className="w-3.5 h-3.5 text-brand-400" />;
    }
    switch (type) {
      case 'circle':
        return <Circle className="w-3.5 h-3.5 text-brand-400" />;
      case 'plane':
        return <Square className="w-3.5 h-3.5 text-emerald-400" />;
      case 'edge':
        return <Minus className="w-3.5 h-3.5 text-amber-400" />;
      case 'vertex':
        return <Dot className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  // 요소 타입별 한글 라벨
  const getElementTypeName = (type?: string, isCylinderFace?: boolean) => {
    if (isCylinderFace) {
      return '원통 곡면';
    }
    switch (type) {
      case 'circle':
        return '원통 / 홀';
      case 'plane':
        return '평면';
      case 'edge':
        return '모서리 선';
      case 'vertex':
        return '꼭짓점';
      default:
        return '형상';
    }
  };

  // 아무 측정값도 없고 1번 선택도 없는 경우 패널 숨김
  if (measurements.length === 0 && !selectedA) {
    return null;
  }

  return (
    <aside
      className="absolute top-14 right-4 z-30 w-80 bg-bg-surface/95 border border-border-default rounded-xl shadow-2xl backdrop-blur-md overflow-hidden text-xs text-text-primary select-none animate-fade-in pointer-events-auto flex flex-col"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* 1. 인벤터 헤더 바 */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-bg-elevated/70 border-b border-border-default">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
            <Ruler className="w-3 h-3 text-brand-400" />
          </div>
          <span className="font-bold tracking-wide text-text-primary">
            측정 (Measure)
          </span>
          {measurements.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-brand-bg text-brand-400 font-mono rounded">
              {currentIdx + 1}/{measurements.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* 수동 단위 전환 스위치 [mm | in] */}
          {onUnitChange && (
            <div className="flex items-center bg-bg-base rounded-md p-0.5 border border-border-subtle font-mono text-[10px]">
              <button
                onClick={() => onUnitChange('mm')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  unit === 'mm' ? 'bg-brand-500 text-white font-bold shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
                title="밀리미터(mm) 단위로 전환"
              >
                mm
              </button>
              <button
                onClick={() => onUnitChange('in')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  unit === 'in' ? 'bg-brand-500 text-white font-bold shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
                title="인치(in) 단위로 전환"
              >
                in
              </button>
            </div>
          )}

          {/* 전체 삭제 / 초기화 */}
          {measurements.length > 0 && (
            <button
              onClick={onClearAll}
              className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              title="모든 치수 초기화"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. 복수 측정 시 상단 인벤터 히스토리 탭 */}
      {measurements.length > 1 && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-bg-base/60 border-b border-border-subtle overflow-x-auto">
          {measurements.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setActiveIdx(idx)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors shrink-0 ${
                idx === currentIdx
                  ? 'bg-brand-500 text-white font-bold shadow-xs'
                  : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              #{idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* 3. 선택된 형상 요약 (Selections) */}
      <div className="p-3 border-b border-border-subtle flex flex-col gap-2 bg-bg-base/30">
        {/* 선택 1 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
              1
            </span>
            <div className="flex items-center gap-1.5">
              {getElementIcon(
                currentMeasure ? currentMeasure.snapA.type : selectedA?.type,
                currentMeasure ? currentMeasure.snapA.isCylinderFace : selectedA?.isCylinderFace
              )}
              <span className="font-semibold text-text-primary">
                {getElementTypeName(
                  currentMeasure ? currentMeasure.snapA.type : selectedA?.type,
                  currentMeasure ? currentMeasure.snapA.isCylinderFace : selectedA?.isCylinderFace
                )}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-text-secondary truncate max-w-[140px]">
            {currentMeasure
              ? currentMeasure.snapA.description || '선택됨'
              : selectedA?.description || '선택됨'}
          </span>
        </div>

        {/* 선택 2 */}
        {currentMeasure?.snapB ? (
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-[10px] font-bold text-brand-400 shrink-0">
                2
              </span>
              <div className="flex items-center gap-1.5">
                {getElementIcon(currentMeasure.snapB.type, currentMeasure.snapB.isCylinderFace)}
                <span className="font-semibold text-text-primary">
                  {getElementTypeName(currentMeasure.snapB.type, currentMeasure.snapB.isCylinderFace)}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-text-secondary truncate max-w-[140px]">
              {currentMeasure.snapB.description || '선택됨'}
            </span>
          </div>
        ) : (
          !currentMeasure && selectedA && (
            <div className="flex items-center gap-2 text-text-muted italic text-[11px] pl-6">
              2번째 대상을 클릭하여 측정하세요...
            </div>
          )
        )}
      </div>

      {/* 4. 측정 결과 본체 */}
      {currentMeasure && (
        <div className="p-3.5 flex flex-col gap-3">
          {/* 주 거리(최단 거리) 대형 표시 */}
          <div className="p-3 bg-bg-elevated rounded-xl border border-border-default flex flex-col gap-1 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">
                {currentMeasure.type === 'hole'
                  ? '직경 (Diameter Ø)'
                  : currentMeasure.type === 'plane_to_plane'
                  ? '평행 면간 거리'
                  : '최단 거리 (Distance)'}
              </span>
              <button
                onClick={() => handleCopy(formatDist(currentMeasure.value), 'main')}
                className="p-1 rounded text-text-muted hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                title="값 복사"
              >
                {copiedKey === 'main' ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-bold font-mono text-brand-400 tracking-tight">
                {formatDist(currentMeasure.value)}
              </span>
              <span className="text-sm font-semibold text-brand-400 font-mono">
                {unit}
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                ({formatSubDist(currentMeasure.value)})
              </span>
            </div>

            {/* 원통/홀 단독 측정 시 반경 표기 */}
            {currentMeasure.type === 'hole' && currentMeasure.snapA.radius && (
              <div className="text-[11px] font-mono text-text-muted mt-0.5">
                반경: R {formatDist(currentMeasure.snapA.radius)} {unit} ({formatSubDist(currentMeasure.snapA.radius)})
              </div>
            )}
          </div>

          {/* 인벤터 스타일 원통 간 측정 옵션 토글 (중심간 / 최소 / 최대) */}
          {currentMeasure.type === 'center_to_center' && currentMeasure.details && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-text-muted font-semibold">
                원통 간 측정 기준:
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-bg-base rounded-lg border border-border-subtle text-[11px]">
                <button
                  onClick={() => onUpdateCircleOption?.(currentMeasure.id, 'center')}
                  className={`py-1 rounded text-center font-mono transition-colors ${
                    (currentMeasure.circleOption || 'center') === 'center'
                      ? 'bg-brand-500 text-white font-bold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  중심간
                </button>
                <button
                  onClick={() => onUpdateCircleOption?.(currentMeasure.id, 'min')}
                  className={`py-1 rounded text-center font-mono transition-colors ${
                    currentMeasure.circleOption === 'min'
                      ? 'bg-brand-500 text-white font-bold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  최소 (안쪽)
                </button>
                <button
                  onClick={() => onUpdateCircleOption?.(currentMeasure.id, 'max')}
                  className={`py-1 rounded text-center font-mono transition-colors ${
                    currentMeasure.circleOption === 'max'
                      ? 'bg-brand-500 text-white font-bold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  최대 (바깥)
                </button>
              </div>
            </div>
          )}

          {/* 🔴X 🟢Y 🔵Z 축별 델타 분해 좌표 (인벤터 표준) */}
          {currentMeasure.details && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-text-muted font-semibold">
                XYZ 축별 분해 거리 (Delta):
              </span>
              <div className="grid grid-cols-3 gap-1.5 font-mono">
                {/* ΔX (빨강) */}
                <button
                  onClick={() => handleCopy(formatDist(currentMeasure.details!.dx), 'dx')}
                  className="flex flex-col p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-left transition-colors"
                >
                  <span className="text-[10px] text-rose-400 font-bold flex items-center justify-between">
                    ΔX
                    {copiedKey === 'dx' && <Check className="w-2.5 h-2.5" />}
                  </span>
                  <span className="text-xs font-bold text-text-primary mt-0.5">
                    {formatDist(currentMeasure.details.dx)} <span className="text-[10px] font-normal text-text-muted">{unit}</span>
                  </span>
                </button>

                {/* ΔY (초록) */}
                <button
                  onClick={() => handleCopy(formatDist(currentMeasure.details!.dy), 'dy')}
                  className="flex flex-col p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-left transition-colors"
                >
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-between">
                    ΔY
                    {copiedKey === 'dy' && <Check className="w-2.5 h-2.5" />}
                  </span>
                  <span className="text-xs font-bold text-text-primary mt-0.5">
                    {formatDist(currentMeasure.details.dy)} <span className="text-[10px] font-normal text-text-muted">{unit}</span>
                  </span>
                </button>

                {/* ΔZ (파랑) */}
                <button
                  onClick={() => handleCopy(formatDist(currentMeasure.details!.dz), 'dz')}
                  className="flex flex-col p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-left transition-colors"
                >
                  <span className="text-[10px] text-blue-400 font-bold flex items-center justify-between">
                    ΔZ
                    {copiedKey === 'dz' && <Check className="w-2.5 h-2.5" />}
                  </span>
                  <span className="text-xs font-bold text-text-primary mt-0.5">
                    {formatDist(currentMeasure.details.dz)} <span className="text-[10px] font-normal text-text-muted">{unit}</span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 사잇각 (Angle) - 평행하지 않은 평면/선인 경우 */}
          {currentMeasure.details?.angleDeg !== undefined && (
            <div className="flex items-center justify-between p-2 bg-bg-base rounded-lg border border-border-subtle">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-[11px]">사잇각 (Angle)</span>
              </div>
              <span className="font-mono font-bold text-amber-400">
                {currentMeasure.details.angleDeg.toFixed(1)}°
              </span>
            </div>
          )}

          {/* 개별 삭제 버튼 */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemoveMeasurement(currentMeasure.id);
            }}
            className="w-full py-1.5 flex items-center justify-center gap-1 text-[11px] text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg border border-transparent hover:border-danger/30 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            이 측정값 삭제
          </button>
        </div>
      )}

      {/* 1번 요소만 선택된 상태에서의 안내 및 치수 프리뷰 */}
      {!currentMeasure && selectedA && (
        <div className="p-3.5 flex flex-col gap-3">
          <div className="p-3 bg-bg-elevated rounded-xl border border-brand-500/30 flex flex-col gap-1 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-brand-400 uppercase tracking-wider font-semibold">
                {selectedA.type === 'circle'
                  ? selectedA.isCylinderFace
                    ? '1번 원통 직경 (Diameter Ø)'
                    : '1번 원 직경 (Diameter Ø)'
                  : '1번 선택 형상'}
              </span>
            </div>

            {selectedA.type === 'circle' && selectedA.diameter !== undefined && (
              <>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl font-bold font-mono text-brand-400 tracking-tight">
                    {formatDist(selectedA.diameter)}
                  </span>
                  <span className="text-sm font-semibold text-brand-400 font-mono">
                    {unit}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    ({formatSubDist(selectedA.diameter)})
                  </span>
                </div>
                {selectedA.radius !== undefined && (
                  <div className="text-[11px] font-mono text-text-muted mt-0.5">
                    반경: R {formatDist(selectedA.radius)} {unit} ({formatSubDist(selectedA.radius)})
                  </div>
                )}
              </>
            )}

            <div className="mt-2 p-2 bg-brand-500/10 rounded-lg border border-brand-500/20 text-text-secondary text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping shrink-0" />
              <span>
                {selectedA.type === 'circle'
                  ? '다른 원통이나 홀을 클릭하면 중심간 거리가 측정됩니다.'
                  : '두 번째 대상을 클릭하여 거리를 측정하세요.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
