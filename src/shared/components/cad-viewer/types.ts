/**
 * MiniPDM 연동 3D CAD 뷰어 공용 타입 정의
 */

// 렌더링 모드: 음영(Shaded), 모서리 강조(Shaded with Edges), 와이어프레임(Wireframe)
export type RenderMode = 'shaded' | 'edges' | 'wireframe';

// 카메라 뷰 프리셋
export type ViewPreset = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso';

// 3D 뷰 궤도 회전 모드: 자유 궤도(Free Orbit / Trackball) vs 턴테이블(Turntable)
export type OrbitMode = 'free' | 'turntable';

// 치수 단위: 밀리미터(mm), 인치(in)
export type CadUnit = 'mm' | 'in';

// 바운딩 박스 표시 모드 (없음, XYZ 축 기준 AABB, 회전 최소 체적 OBB)
export type BoundingBoxMode = 'none' | 'aabb' | 'obb';

export interface OBBData {
  center: [number, number, number];
  size: [number, number, number]; // [길이, 폭, 높이]
  quaternion: [number, number, number, number]; // [x, y, z, w]
  axes: [
    [number, number, number],
    [number, number, number],
    [number, number, number]
  ];
  volume: number;
  volumeSavingsPercent: number; // AABB 대비 부피 절감율 (%)
}

// 소재 형상 판정 타입: 원형(환봉/Cylinder/Round) 또는 사각(각재/Block/Box)
export type MaterialShapeType = 'round' | 'box';

export interface ShapeRecommendation {
  type: 'round_bar' | 'block';
  label: string; // 예: "Ø 150.00 × 200.00 L (환봉)" 또는 "300.00 × 300.00 × 300.00 (각재)"
  diameter?: number; // 원형인 경우 직경 (Ø)
  length?: number; // 원형인 경우 길이 (L)
  width?: number; // 각재인 경우 가로
  depth?: number; // 각재인 경우 세로
  height?: number; // 각재인 경우 높이
  unit: CadUnit;
}

export interface ShapeClassification {
  shapeType: MaterialShapeType; // 'round' (원형/환봉) | 'box' (사각/각재)
  confidence: number; // 판정 신뢰도 (0.0 ~ 1.0)
  recommendation: ShapeRecommendation;
  details: {
    axis?: 'x' | 'y' | 'z'; // 원형인 경우 길이 방향 회전축
    circularityScore: number; // 외곽 원호 일치도 (0.0 ~ 1.0)
    hasCircularFeature: boolean; // 외곽 원호 검출 여부
    volumeFillRatio: number; // 실제 메쉬 부피 / 바운딩박스 부피 비율
    reason: string; // 판정 사유 (한국어 설명)
  };
}

// 모델 바운딩 박스 및 메타데이터 정보 (금속 가공 외곽 치수 계산용)
export interface ModelMetadata {
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number]; // [가로 X, 세로 Y, 높이 Z] (mm 기준 기본)
  };
  obb?: OBBData; // 최소 사이즈 바운딩 박스 (OBB)
  shapeClassification?: ShapeClassification; // 원형(환봉) vs 사각(각재) 소재 형상 판정
  meshCount: number;
  triangleCount: number;
  fileName?: string;
  fileSizeBytes?: number;
  detectedUnit?: CadUnit; // STP 파일에서 자동 감지된 원본 설계 단위 ('in' 또는 'mm')
}

// 스마트 스냅 대상 기하학적 요소 타입
export type SnapElementType = 'vertex' | 'edge' | 'circle' | 'plane';

// 스냅된 요소의 세부 기하학적 정보
export interface SnapElement {
  type: SnapElementType;
  point: [number, number, number]; // 마우스가 스냅된 3D 좌표 (x, y, z)
  normal?: [number, number, number]; // 평면 또는 원호의 법선 벡터
  radius?: number; // 원/원통인 경우 반지름 (mm)
  diameter?: number; // 원/원통인 경우 직경 (mm)
  center?: [number, number, number]; // 원/원통인 경우 중심 좌표
  axis?: [number, number, number]; // 원통 축 방향 벡터
  edgeStart?: [number, number, number]; // 직선 모서리 시작점
  edgeEnd?: [number, number, number]; // 직선 모서리 끝점
  length?: number; // 직선 모서리 길이
  description?: string; // 화면 표기용 설명 (예: "홀 (Ø 12.00 mm)", "평면")
  planeVertices?: Float32Array; // 평면 전체 하이라이트용 삼각형 정점 버퍼
  isCylinderFace?: boolean; // 원통 곡면에서 감지되었는지 여부
  cylinderAxis?: { start: [number, number, number]; end: [number, number, number] }; // 원통 중심축 시작점과 끝점
}

// 측정 유형: 홀 직경, 중심-중심, 면-면, 점-면, 점-점
export type MeasurementType = 
  | 'hole' 
  | 'center_to_center' 
  | 'plane_to_plane' 
  | 'point_to_plane' 
  | 'point_to_point';

// 측정 결과 데이터 모델
export interface MeasurementItem {
  id: string;
  type: MeasurementType;
  value: number; // 주 측정값 (mm)
  label: string; // 표기 텍스트 (예: "Ø 12.00 mm", "45.50 mm")
  details?: {
    dx: number;
    dy: number;
    dz: number;
    innerDist?: number; // 원과 원 사이 안쪽 최소 간격 (Min Distance)
    outerDist?: number; // 원과 원 사이 바깥쪽 최대 간격 (Max Distance)
    angleDeg?: number; // 두 면 또는 두 선 사이의 사잇각 (Angle °)
  };
  circleOption?: 'center' | 'min' | 'max'; // 인벤터식 원통 측정 옵션 (기본: center)
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  snapA: SnapElement;
  snapB?: SnapElement;
}

// 뷰어 없이 백그라운드에서 고속 추출된 바운딩 박스 결과 인터페이스
export interface StepBoundingBoxResult {
  fileName?: string;
  fileSizeBytes: number;
  detectedUnit: CadUnit; // STP 원본 감지 단위 ('mm' 또는 'in')
  unit: CadUnit; // 치수 결과 단위 ('mm' 또는 'in')
  meshCount: number;
  triangleCount: number;
  // 전역 좌표축 정렬 바운딩 박스 (가공 외곽 AABB 치수)
  aabb: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number]; // [가로 X, 세로 Y, 높이 Z]
    center: [number, number, number];
    volume: number;
  };
  // PCA 주성분 분석 기반 최적 회전 최소 체적 바운딩 박스 (최소 OBB 블록 치수)
  obb?: {
    center: [number, number, number];
    size: [number, number, number]; // [길이, 폭, 높이]
    quaternion: [number, number, number, number];
    axes: [
      [number, number, number],
      [number, number, number],
      [number, number, number]
    ];
    volume: number;
    volumeSavingsPercent: number; // AABB 대비 부피 절감율 (%)
  };
  // 원형(환봉) vs 사각(각재) 소재 형상 자동 판별 및 추천 자재 규격
  shapeClassification?: ShapeClassification;
  executionTimeMs: number; // 백그라운드 연산 소요 시간 (밀리초)
}

// 견적 및 수주 폼에 직접 적용할 가공 규격 및 원소재 치수 데이터
export interface AppliedDimensions {
  spec_w: number;
  spec_d: number;
  spec_h: number;
  raw_w: number;
  raw_d: number;
  raw_h: number;
  shape: 'rect' | 'round';
  unit: CadUnit;
}

// CadViewer 컴포넌트의 외부 주입 Props 인터페이스
export interface CadViewerProps {
  // 로드할 파일 (ArrayBuffer, Blob, File 객체 또는 원격 R2 스토리지 URL)
  file: ArrayBuffer | Blob | File | string;
  fileName?: string;
  
  // 모달 모드 또는 인라인 임베디드 모드 여부 (기본: false)
  isModal?: boolean;
  onClose?: () => void;
  
  // 초기 테마 및 렌더 모드 설정
  initialRenderMode?: RenderMode;
  initialOrbitMode?: OrbitMode; // 초기 3D 회전 궤도 모드 ('free' | 'turntable')
  showDimensionsBanner?: boolean; // 상단 가공 외곽 치수(X, Y, Z mm) 배너 표시 여부
  showGrid?: boolean; // 바닥 그리드(눈금선) 표시 여부 (기본: false)
  
  // 치수 측정 목록 변경 시 콜백 (견적 산출 등에 연동 가능)
  onMeasurementsChange?: (measurements: MeasurementItem[]) => void;
  
  // 바운딩 박스 및 소재 치수 계산 완료 시 콜백 (MiniPDM 견적/발주 폼 자동 입력 연동)
  onBoundingBoxCalculated?: (result: StepBoundingBoxResult) => void;

  // ✨ 3D 측정/바운딩 박스 치수를 견적 및 수주 폼에 원클릭으로 직접 적용하는 콜백
  onApplyDimensions?: (dimensions: AppliedDimensions) => void;
  
  className?: string;
}
