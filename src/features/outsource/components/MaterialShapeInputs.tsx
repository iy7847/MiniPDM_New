import React from 'react';
import { NumberInput } from '@/design-system/NumberInput';

export type ShapeCategory = '판재/각재류' | '봉재류' | '파이프류' | '형강류' | '기타';

export const SHAPE_OPTIONS: Record<ShapeCategory, string[]> = {
  '판재/각재류': ['일반 판재', '각가공', '부스바'],
  '봉재류': ['환봉', '마환봉', '연마봉', '열처리 연마봉', '연마 도금봉', '열처리 연마 도금봉', '육각봉'],
  '파이프류': ['사각 파이프', '원형 파이프'],
  '형강류': ['L형강', 'ㄷ형강', 'H형강'],
  '기타': ['기타'],
};

export const DEFAULT_SHAPES: Record<ShapeCategory, string> = {
  '판재/각재류': '일반 판재',
  '봉재류': '환봉',
  '파이프류': '사각 파이프',
  '형강류': 'L형강',
  '기타': '기타',
};

export interface MaterialDimensions {
  w?: number;
  d?: number;
  h?: number;
  t?: number;
  t2?: number;
  l?: number;
}

export function calculateMaterialVolume(shape: string, dims: MaterialDimensions): number {
  const { w = 0, d = 0, h = 0, t = 0, t2 = 0, l = 0 } = dims;

  if (SHAPE_OPTIONS['판재/각재류'].includes(shape)) {
    return w * d * t;
  }

  if (shape === '육각봉') {
    // w: 대변(d), l: 길이
    // Area = (sqrt(3)/2) * w^2
    return (Math.sqrt(3) / 2) * Math.pow(w, 2) * l;
  }

  if (SHAPE_OPTIONS['봉재류'].includes(shape)) {
    // w: 외경, l: 길이
    return Math.PI * Math.pow(w / 2, 2) * l;
  }

  if (shape === '원형 파이프') {
    // w: 외경, t: 두께, l: 길이
    // Area = pi * t * (w - t)
    return Math.PI * t * (w - t) * l;
  }

  if (shape === '사각 파이프') {
    // w: 가로, h: 세로, t: 두께, l: 길이
    // Area = W*H - (W-2t)*(H-2t)
    return ((w * h) - ((w - 2 * t) * (h - 2 * t))) * l;
  }

  if (shape === 'L형강') {
    // w: 가로, h: 세로, t: 두께, l: 길이
    return ((w * t) + ((h - t) * t)) * l;
  }

  if (shape === 'ㄷ형강') {
    // w: 가로, h: 세로, t: 두께, l: 길이
    return ((w * t) + 2 * ((h - t) * t)) * l;
  }

  if (shape === 'H형강') {
    // w: 가로(플랜지), h: 높이, t: 웹 두께, t2: 플랜지 두께, l: 길이
    return ((h - 2 * t2) * t + 2 * (w * t2)) * l;
  }

  return 0;
}

interface Props {
  category: ShapeCategory;
  shape: string;
  dims: MaterialDimensions;
  onChange: (dims: MaterialDimensions) => void;
}

export function MaterialShapeInputs({ category, shape, dims, onChange }: Props) {
  const update = (key: keyof MaterialDimensions, val: number | undefined) => {
    onChange({ ...dims, [key]: val });
  };

  const renderInput = (label: string, key: keyof MaterialDimensions) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-text-secondary whitespace-nowrap block">{label} (mm)</label>
      <NumberInput
        value={dims[key] || 0}
        onChange={(v) => update(key, v)}
        min={0}
        step={0.1}
      />
    </div>
  );

  const getInputs = () => {
    if (category === '판재/각재류') {
      return (
        <>
          <div className="col-span-full mb-2 bg-bg-elevated p-4 rounded-lg flex items-center gap-4">
            <svg width="80" height="60" viewBox="0 0 80 60" className="text-purple-500 flex-shrink-0">
              <path d="M 10 40 L 40 10 L 70 10 L 40 40 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
              <path d="M 10 40 L 10 50 L 40 50 L 70 20 L 70 10 L 40 40" fill="none" stroke="currentColor" strokeWidth="2" />
              <text x="20" y="55" fontSize="10" fill="currentColor" fontWeight="bold">W</text>
              <text x="50" y="25" fontSize="10" fill="currentColor" fontWeight="bold">D</text>
              <text x="5" y="45" fontSize="10" fill="currentColor" fontWeight="bold">T</text>
            </svg>
            <div className="text-sm text-text-secondary break-keep">T: 두께, W: 가로, D: 세로</div>
          </div>
          {renderInput('두께 (T)', 't')}
          {renderInput('가로 (W)', 'w')}
          {renderInput('세로 (D)', 'd')}
        </>
      );
    }

    if (category === '봉재류') {
      const isHex = shape === '육각봉';
      return (
        <>
          <div className="col-span-full mb-2 bg-bg-elevated p-4 rounded-lg flex items-center gap-4">
            <svg width="80" height="60" viewBox="0 0 80 60" className="text-blue-500 flex-shrink-0">
              <ellipse cx="20" cy="30" rx="10" ry="20" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
              <path d="M 20 10 L 60 10 A 10 20 0 0 1 60 50 L 20 50" fill="none" stroke="currentColor" strokeWidth="2" />
              <text x="12" y="33" fontSize="10" fill="currentColor" fontWeight="bold">D</text>
              <text x="40" y="58" fontSize="10" fill="currentColor" fontWeight="bold">L</text>
            </svg>
            <div className="text-sm text-text-secondary break-keep">
              {isHex ? 'D: 대변(평행한 두 변 사이의 거리), L: 길이' : 'D: 외경(지름), L: 길이'}
            </div>
          </div>
          {renderInput(isHex ? '대변 (D)' : '외경 (D)', 'w')}
          {renderInput('길이 (L)', 'l')}
        </>
      );
    }

    if (shape === '원형 파이프') {
      return (
        <>
          <div className="col-span-full mb-2 bg-bg-elevated p-4 rounded-lg flex items-center gap-4">
            <svg width="80" height="60" viewBox="0 0 80 60" className="text-emerald-500 flex-shrink-0">
              <circle cx="25" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="25" cy="30" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 25 10 L 60 10 A 20 20 0 0 1 60 50 L 25 50" fill="none" stroke="currentColor" strokeWidth="2" />
              <text x="21" y="33" fontSize="10" fill="currentColor" fontWeight="bold">D</text>
              <text x="5" y="15" fontSize="10" fill="currentColor" fontWeight="bold">T</text>
            </svg>
            <div className="text-sm text-text-secondary break-keep">D: 외경, T: 두께, L: 길이</div>
          </div>
          {renderInput('외경 (D)', 'w')}
          {renderInput('두께 (T)', 't')}
          {renderInput('길이 (L)', 'l')}
        </>
      );
    }

    if (shape === '사각 파이프') {
      return (
        <>
          <div className="col-span-full mb-2 bg-bg-elevated p-4 rounded-lg flex items-center gap-4">
            <svg width="80" height="60" viewBox="0 0 80 60" className="text-orange-500 flex-shrink-0">
              <rect x="10" y="15" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" />
              <rect x="15" y="20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 10 15 L 40 5 L 70 5 L 70 35 L 40 45" fill="none" stroke="currentColor" strokeWidth="2" />
              <text x="20" y="55" fontSize="10" fill="currentColor" fontWeight="bold">W</text>
              <text x="2" y="33" fontSize="10" fill="currentColor" fontWeight="bold">H</text>
              <text x="5" y="12" fontSize="10" fill="currentColor" fontWeight="bold">T</text>
            </svg>
            <div className="text-sm text-text-secondary break-keep">W: 가로, H: 세로, T: 두께, L: 길이</div>
          </div>
          {renderInput('가로 (W)', 'w')}
          {renderInput('세로 (H)', 'h')}
          {renderInput('두께 (T)', 't')}
          {renderInput('길이 (L)', 'l')}
        </>
      );
    }

    if (shape === 'L형강') {
      return (
        <>
          <div className="col-span-full mb-2 bg-bg-elevated p-4 rounded-lg flex items-center gap-4">
            <svg width="80" height="60" viewBox="0 0 80 60" className="text-cyan-500 flex-shrink-0">
              <path d="M 15 10 L 25 10 L 25 40 L 55 40 L 55 50 L 15 50 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
              <text x="35" y="58" fontSize="10" fill="currentColor" fontWeight="bold">W</text>
              <text x="5" y="30" fontSize="10" fill="currentColor" fontWeight="bold">H</text>
              <text x="35" y="35" fontSize="10" fill="currentColor" fontWeight="bold">T</text>
            </svg>
            <div className="text-sm text-text-secondary break-keep">W: 가로, H: 세로, T: 두께, L: 길이</div>
          </div>
          {renderInput('가로 (W)', 'w')}
          {renderInput('세로 (H)', 'h')}
          {renderInput('두께 (T)', 't')}
          {renderInput('길이 (L)', 'l')}
        </>
      );
    }

    if (shape === 'ㄷ형강') {
      return (
        <>
          <div className="col-span-full mb-2 bg-bg-elevated p-4 rounded-lg flex items-center gap-4">
            <svg width="80" height="60" viewBox="0 0 80 60" className="text-cyan-500 flex-shrink-0">
              <path d="M 50 10 L 15 10 L 15 50 L 50 50 L 50 40 L 25 40 L 25 20 L 50 20 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
              <text x="30" y="58" fontSize="10" fill="currentColor" fontWeight="bold">W</text>
              <text x="5" y="30" fontSize="10" fill="currentColor" fontWeight="bold">H</text>
              <text x="30" y="35" fontSize="10" fill="currentColor" fontWeight="bold">T</text>
            </svg>
            <div className="text-sm text-text-secondary break-keep">W: 가로, H: 세로, T: 두께, L: 길이</div>
          </div>
          {renderInput('가로 (W)', 'w')}
          {renderInput('세로 (H)', 'h')}
          {renderInput('두께 (T)', 't')}
          {renderInput('길이 (L)', 'l')}
        </>
      );
    }

    if (shape === 'H형강') {
      return (
        <>
          <div className="col-span-full mb-2 bg-bg-elevated p-4 rounded-lg flex items-center gap-4">
            <svg width="80" height="60" viewBox="0 0 80 60" className="text-cyan-500 flex-shrink-0">
              <path d="M 15 10 L 45 10 L 45 20 L 35 20 L 35 40 L 45 40 L 45 50 L 15 50 L 15 40 L 25 40 L 25 20 L 15 20 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
              <text x="25" y="8" fontSize="10" fill="currentColor" fontWeight="bold">W</text>
              <text x="5" y="30" fontSize="10" fill="currentColor" fontWeight="bold">H</text>
              <text x="48" y="30" fontSize="10" fill="currentColor" fontWeight="bold">T1(웹)</text>
              <text x="48" y="15" fontSize="10" fill="currentColor" fontWeight="bold">T2(플랜지)</text>
            </svg>
            <div className="text-sm text-text-secondary break-keep">W: 가로, H: 높이, T1: 웹두께, T2: 플랜지두께, L: 길이</div>
          </div>
          {renderInput('가로 (W)', 'w')}
          {renderInput('높이 (H)', 'h')}
          {renderInput('웹두께 (T1)', 't')}
          {renderInput('플랜지 (T2)', 't2')}
          {renderInput('길이 (L)', 'l')}
        </>
      );
    }

    return null;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bg-surface p-4 rounded-xl border border-border-default mt-4">
      {getInputs()}
    </div>
  );
}
