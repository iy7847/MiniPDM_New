/**
 * MiniPDM 공용 3D CAD 뷰어 상단 통합 헤더 및 툴바
 * (뷰 프리셋, 렌더 모드, 바운딩 박스, 스마트 치수 측정, 단면 절단 서브바, 궤도 회전 모드)
 */
import React from 'react';
import {
  Ruler,
  Box,
  Layers,
  Scissors,
  RotateCcw,
  Eye,
  X,
  Sliders,
  RotateCw,
  Globe,
} from 'lucide-react';
import type { RenderMode, ViewPreset, BoundingBoxMode, OrbitMode } from './types';

interface CadToolbarProps {
  fileName?: string;
  renderMode: RenderMode;
  onRenderModeChange: (mode: RenderMode) => void;
  onViewPreset: (preset: ViewPreset) => void;
  onResetCamera: () => void;

  // 궤도 회전 모드 제어
  orbitMode?: OrbitMode;
  onOrbitModeChange?: (mode: OrbitMode) => void;

  // 바운딩 박스 제어
  boundingBoxMode: BoundingBoxMode;
  onBoundingBoxModeChange: (mode: BoundingBoxMode) => void;

  // 측정 모드
  isMeasureMode: boolean;
  onToggleMeasureMode: () => void;

  // 단면 절단 (Clipping)
  isClippingActive: boolean;
  onToggleClipping: () => void;
  clipAxis: 'x' | 'y' | 'z';
  onClipAxisChange: (axis: 'x' | 'y' | 'z') => void;
  clipOffset: number;
  onClipOffsetChange: (val: number) => void;

  // 창 제어
  onClose?: () => void;
}

export const CadToolbar: React.FC<CadToolbarProps> = ({
  fileName = 'model.stp',
  renderMode,
  onRenderModeChange,
  onViewPreset,
  onResetCamera,
  orbitMode = 'free',
  onOrbitModeChange,
  boundingBoxMode,
  onBoundingBoxModeChange,
  isMeasureMode,
  onToggleMeasureMode,
  isClippingActive,
  onToggleClipping,
  clipAxis,
  onClipAxisChange,
  clipOffset,
  onClipOffsetChange,
  onClose,
}) => {
  return (
    <header className="relative w-full z-30 flex flex-col select-none shrink-0">
      {/* 1. 메인 통합 헤더 바 (높이 48px 고정) */}
      <div className="w-full h-12 bg-bg-surface border-b border-border-default px-3 sm:px-4 flex items-center justify-between gap-3">
        {/* [좌측] 파일 정보 */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <Box className="w-4 h-4 text-brand-400 shrink-0" />
          <span
            className="text-xs sm:text-sm font-bold text-text-primary truncate max-w-[140px] sm:max-w-[220px]"
            title={fileName}
          >
            {fileName}
          </span>
          <span className="hidden xs:inline-block text-[10px] px-1.5 py-0.5 bg-brand-bg text-brand-400 font-mono font-semibold rounded shrink-0">
            STEP / STP
          </span>
        </div>

        {/* [중앙] CAD 제어 도구 모음 */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1">
          {/* 카메라 프리셋 그룹 */}
          <div className="flex items-center gap-0.5 bg-bg-base p-0.5 rounded-lg border border-border-subtle shrink-0 text-xs">
            <button
              onClick={onResetCamera}
              className="flex items-center gap-1 px-2 py-1 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md transition-colors"
              title="카메라 원위치 맞춤 (Fit)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-400" />
              <span className="font-medium hidden md:inline">초기화</span>
            </button>
            <div className="w-[1px] h-3.5 bg-border-subtle mx-0.5" />
            {(['iso', 'top', 'front', 'right'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => onViewPreset(preset)}
                className="px-1.5 sm:px-2 py-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors font-medium"
                title={`${preset.toUpperCase()} 뷰`}
              >
                {preset === 'iso' ? '등각' : preset === 'top' ? '평면' : preset === 'front' ? '정면' : '우측'}
              </button>
            ))}
          </div>

          <div className="w-[1px] h-4 bg-border-default mx-0.5 hidden sm:block shrink-0" />

          {/* 렌더 모드 그룹 */}
          <div className="flex items-center gap-0.5 bg-bg-base p-0.5 rounded-lg border border-border-subtle shrink-0 text-xs">
            <button
              onClick={() => onRenderModeChange('edges')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                renderMode === 'edges'
                  ? 'bg-brand-500 text-white font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="모서리 강조 음영 (Shaded with Edges)"
            >
              <Box className="w-3 h-3" />
              <span className="hidden lg:inline">모서리</span>
            </button>
            <button
              onClick={() => onRenderModeChange('shaded')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                renderMode === 'shaded'
                  ? 'bg-brand-500 text-white font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="부드러운 음영 (Shaded)"
            >
              <Eye className="w-3 h-3" />
              <span className="hidden lg:inline">음영</span>
            </button>
            <button
              onClick={() => onRenderModeChange('wireframe')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                renderMode === 'wireframe'
                  ? 'bg-brand-500 text-white font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="와이어프레임 (Wireframe)"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden lg:inline">선형</span>
            </button>
          </div>

          <div className="w-[1px] h-4 bg-border-default mx-0.5 hidden sm:block shrink-0" />

          {/* 바운딩 박스 (AABB / 최소 OBB) 토글 그룹 */}
          <div className="flex items-center gap-0.5 bg-bg-base p-0.5 rounded-lg border border-border-subtle shrink-0 text-xs">
            <button
              onClick={() => onBoundingBoxModeChange(boundingBoxMode === 'aabb' ? 'none' : 'aabb')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                boundingBoxMode === 'aabb'
                  ? 'bg-cyan-500 text-white font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="X, Y, Z 축 기준 바운딩 박스 (AABB)"
            >
              <Box className={`w-3 h-3 ${boundingBoxMode === 'aabb' ? 'text-white' : 'text-cyan-400'}`} />
              <span>XYZ 박스</span>
            </button>
            <button
              onClick={() => onBoundingBoxModeChange(boundingBoxMode === 'obb' ? 'none' : 'obb')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                boundingBoxMode === 'obb'
                  ? 'bg-amber-500 text-white font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="최소 사이즈 가공 소재 바운딩 박스 (최적 OBB)"
            >
              <Box className={`w-3 h-3 ${boundingBoxMode === 'obb' ? 'text-white' : 'text-amber-400'}`} />
              <span>최소 박스</span>
            </button>
          </div>

          <div className="w-[1px] h-4 bg-border-default mx-0.5 shrink-0" />

          {/* 🌟 스마트 치수 측정 버튼 */}
          <button
            onClick={onToggleMeasureMode}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              isMeasureMode
                ? 'bg-brand-500 text-white shadow-glow border border-brand-400'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-border-subtle bg-bg-base'
            }`}
            title="스마트 치수 측정 모드 토글 (홀 직경, 중심거리, 면간거리)"
          >
            <Ruler className="w-3.5 h-3.5 text-brand-400" />
            <span>치수 측정</span>
            {isMeasureMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            )}
          </button>

          {/* ✂️ 솔리드 단면 절단 토글 버튼 */}
          <button
            onClick={onToggleClipping}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              isClippingActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-border-subtle bg-bg-base'
            }`}
            title="내부 솔리드 단면 절단 뷰"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>단면</span>
          </button>

          {/* 🌐 궤도 회전 모드 (자유 궤도 vs 턴테이블) 토글 버튼 */}
          {onOrbitModeChange && (
            <button
              onClick={() => onOrbitModeChange(orbitMode === 'free' ? 'turntable' : 'free')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                orbitMode === 'free'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-border-subtle bg-bg-base'
              }`}
              title={
                orbitMode === 'free'
                  ? '현재: 360° 자유 궤도 모드 (클릭 시 턴테이블 모드로 전환)'
                  : '현재: 턴테이블 모드 (클릭 시 360° 자유 궤도 모드로 전환)'
              }
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{orbitMode === 'free' ? '자유 궤도' : '턴테이블'}</span>
            </button>
          )}
        </div>

        {/* [우측] 창 닫기 버튼 (단 1개로 통일) */}
        <div className="flex items-center shrink-0">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. 단면 절단 활성화 시 펼쳐지는 전용 서브 제어 바 (Sub-bar) */}
      {isClippingActive && (
        <div className="w-full h-10 bg-bg-surface/95 border-b border-border-default px-4 flex items-center justify-between gap-4 text-xs animate-slide-down">
          {/* 좌측: 축 선택 */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-text-secondary font-medium flex items-center gap-1">
              <Scissors className="w-3 h-3 text-amber-400" />
              절단 축:
            </span>
            <div className="flex items-center bg-bg-base rounded-md p-0.5 border border-border-subtle">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <button
                  key={axis}
                  onClick={() => onClipAxisChange(axis)}
                  className={`px-2 py-0.5 uppercase rounded text-[11px] font-bold transition-colors ${
                    clipAxis === axis
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {axis}
                </button>
              ))}
            </div>
          </div>

          {/* 중앙: 위치 슬라이더 */}
          <div className="flex-1 max-w-md flex items-center gap-3">
            <span className="text-text-muted text-[11px] shrink-0">위치 조절</span>
            <input
              type="range"
              min="-100"
              max="100"
              value={clipOffset}
              onChange={(e) => onClipOffsetChange(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-bg-base rounded-lg"
              title="단면 위치 이동"
            />
            <span className="font-mono text-[11px] text-amber-400 font-semibold w-10 text-right shrink-0">
              {clipOffset > 0 ? `+${clipOffset}` : clipOffset}%
            </span>
          </div>

          {/* 우측: 슬라이더 0 초기화 및 닫기 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onClipOffsetChange(0)}
              className="px-2 py-0.5 rounded text-[11px] text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-border-subtle transition-colors"
              title="단면을 모델 중심(0%)으로 복귀"
            >
              중앙 복귀
            </button>
            <button
              onClick={onToggleClipping}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              title="단면 절단 모드 끄기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
