/**
 * MiniPDM 3D CAD 뷰어 공용 모듈 엔트리포인트
 */
export { CadViewer } from './CadViewer';
export { GlobalCadViewer } from './GlobalCadViewer';
export { CadCanvas } from './CadCanvas';
export { CadToolbar } from './CadToolbar';
export { CadDimensionsBanner } from './CadDimensionsBanner';
export { CadStatusBar } from './CadStatusBar';
export { useStepLoader } from './hooks/useStepLoader';

export { calculateBoundingBoxes } from './geometry/BoundingBoxCalculator';
export { classifyPartShape } from './geometry/ShapeClassifier';
export { extractStepBoundingBox } from './utils/extractStepBoundingBox';

// 타입 정의 export
export type {
  CadViewerProps,
  RenderMode,
  ViewPreset,
  OrbitMode,
  ModelMetadata,
  SnapElement,
  SnapElementType,
  MeasurementItem,
  MeasurementType,
  BoundingBoxMode,
  OBBData,
  StepBoundingBoxResult,
  MaterialShapeType,
  ShapeClassification,
  ShapeRecommendation,
  AppliedDimensions,
} from './types';

