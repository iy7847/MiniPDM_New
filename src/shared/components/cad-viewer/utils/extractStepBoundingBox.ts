/**
 * 3D 뷰어(Canvas/Three.js)를 띄우지 않고 백그라운드에서 STEP 파일의
 * 가공 소재 치수(AABB) 및 최소 사이즈 블록 치수(OBB)를 초고속 추출하는 독립 모듈
 */
import { detectStepUnit, type ParsedMesh } from '../workers/stepParserCore';
import { calculateBoundingBoxes } from '../geometry/BoundingBoxCalculator';
import type { StepBoundingBoxResult } from '../types';

let cachedOcct: any = null;
let scriptLoadingPromise: Promise<void> | null = null;

/**
 * OpenCASCADE WASM 스크립트 및 인스턴스 싱글톤 로더
 * HTML에 <script> 태그가 누락되어도 자동으로 동적 로드 지원
 */
async function getOcctInstance(): Promise<any> {
  if (cachedOcct) return cachedOcct;

  // 1. window.occtimportjs가 없는 경우 동적으로 스크립트 로드
  if (typeof window !== 'undefined' && !(window as any).occtimportjs) {
    if (!scriptLoadingPromise) {
      scriptLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = typeof window !== 'undefined' && window.location.protocol.startsWith('http')
          ? '/occt-import-js.js'
          : './occt-import-js.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('occt-import-js.js 스크립트 로드 실패'));
        document.head.appendChild(script);
      });
    }
    await scriptLoadingPromise;
  }

  const occtimportjs = typeof window !== 'undefined' ? (window as any).occtimportjs : (self as any).occtimportjs;
  if (!occtimportjs) {
    throw new Error('occt-import-js 엔진을 찾을 수 없습니다. public/occt-import-js.js를 확인하세요.');
  }

  cachedOcct = await occtimportjs({
    locateFile: (name: string) => {
      if (name.endsWith('.wasm')) {
        return typeof window !== 'undefined' && window.location.protocol.startsWith('http')
          ? '/occt-import-js.wasm'
          : './occt-import-js.wasm';
      }
      return name;
    },
  });

  return cachedOcct;
}

/**
 * 뷰어 없이 STEP 파일에서 바운딩 박스를 직접 추출하는 고속 독립 비동기 함수
 * 
 * @param file ArrayBuffer, Blob, File, 또는 다운로드 URL 문자열
 * @param options 선택적 옵션 (단위 'mm' | 'in', 파일명)
 * @returns 바운딩 박스(AABB, 최소 OBB), 단위, 소요 시간 등이 포함된 결과 객체
 */
export async function extractStepBoundingBox(
  file: ArrayBuffer | Blob | File | string,
  options?: { unit?: 'mm' | 'in'; fileName?: string } | string
): Promise<StepBoundingBoxResult> {
  const startTime = performance.now();

  const fileNameParam = typeof options === 'string' ? options : options?.fileName;
  const requestedUnit = typeof options === 'object' ? options?.unit : undefined;

  // 1. ArrayBuffer 데이터 확보
  let buffer: ArrayBuffer;
  let resolvedFileName = fileNameParam || 'model.stp';

  if (typeof file === 'string') {
    resolvedFileName = fileNameParam || file.split('/').pop()?.split('?')[0] || 'model.stp';
    const response = await fetch(file);
    if (!response.ok) {
      throw new Error(`파일 다운로드 실패 (${response.status}: ${response.statusText})`);
    }
    buffer = await response.arrayBuffer();
  } else if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
    if (file instanceof File && !fileNameParam) {
      resolvedFileName = file.name;
    }
    buffer = await file.arrayBuffer();
  } else if (file instanceof ArrayBuffer) {
    buffer = file;
  } else {
    throw new Error('지원되지 않는 파일 입력 형식입니다.');
  }

  if (!buffer || buffer.byteLength === 0) {
    throw new Error('파일 데이터가 비어 있습니다.');
  }

  // 2. ISO 10303 헤더 기반 설계 단위 고속 자동 감지
  const { unit: detectedUnit } = detectStepUnit(buffer);
  const targetUnit = requestedUnit || detectedUnit;
  const unitScale = targetUnit === 'in' ? 1 / 25.4 : 1.0;

  // 3. OpenCASCADE WASM 테셀레이션 실행 (렌더러, Three.js 씬 생성 없이 순수 데이터만 추출)
  const occt = await getOcctInstance();
  const fileBytes = new Uint8Array(buffer);
  const occtResult = occt.ReadStepFile(fileBytes);

  if (!occtResult || !occtResult.success || !occtResult.meshes || occtResult.meshes.length === 0) {
    throw new Error('STP 파싱 실패: 유효한 솔리드 지오메트리를 찾을 수 없습니다.');
  }

  // 4. 메쉬 정점 버퍼 수집 (OpenCASCADE 기본 mm 정점 데이터)
  let totalTriangles = 0;
  const parsedMeshes: ParsedMesh[] = [];

  for (let i = 0; i < occtResult.meshes.length; i++) {
    const rawMesh = occtResult.meshes[i];
    const positions = new Float32Array(rawMesh.attributes.position.array);
    const indices = rawMesh.index ? new Uint32Array(rawMesh.index.array) : new Uint32Array(0);
    totalTriangles += indices.length > 0 ? indices.length / 3 : positions.length / 9;

    parsedMeshes.push({
      name: rawMesh.name || `mesh_${i}`,
      color: rawMesh.color ? [rawMesh.color[0], rawMesh.color[1], rawMesh.color[2]] : undefined,
      positions,
      normals: rawMesh.attributes.normal?.array || new Float32Array(0),
      indices,
    });
  }

  // 5. 정밀 AABB, PCA 기반 최소 체적 OBB 및 원형/사각 형상 판정 고속 계산
  const boundingBoxes = calculateBoundingBoxes(parsedMeshes, []);
  const executionTimeMs = Math.round(performance.now() - startTime);

  // 단위 환산 적용 (in 요청 시 인치로 변환, 기본 mm)
  const aabbSize: [number, number, number] = [
    Number((boundingBoxes.aabb.size[0] * unitScale).toFixed(3)),
    Number((boundingBoxes.aabb.size[1] * unitScale).toFixed(3)),
    Number((boundingBoxes.aabb.size[2] * unitScale).toFixed(3)),
  ];

  const obbResult = boundingBoxes.obb
    ? {
        ...boundingBoxes.obb,
        size: [
          Number((boundingBoxes.obb.size[0] * unitScale).toFixed(3)),
          Number((boundingBoxes.obb.size[1] * unitScale).toFixed(3)),
          Number((boundingBoxes.obb.size[2] * unitScale).toFixed(3)),
        ] as [number, number, number],
      }
    : undefined;

  // 원소재 형상 추천 단위 환산
  let shapeClassification = boundingBoxes.shape;
  if (shapeClassification) {
    if (shapeClassification.shapeType === 'round' && shapeClassification.recommendation.diameter && shapeClassification.recommendation.length) {
      const dia = Number((shapeClassification.recommendation.diameter * unitScale).toFixed(2));
      const len = Number((shapeClassification.recommendation.length * unitScale).toFixed(2));
      shapeClassification = {
        ...shapeClassification,
        recommendation: {
          ...shapeClassification.recommendation,
          diameter: dia,
          length: len,
          unit: targetUnit,
          label: `Ø ${dia.toFixed(2)} × ${len.toFixed(2)} L (환봉)`,
        },
      };
    } else if (shapeClassification.shapeType === 'box') {
      const targetSize = obbResult ? obbResult.size : aabbSize;
      shapeClassification = {
        ...shapeClassification,
        recommendation: {
          ...shapeClassification.recommendation,
          width: targetSize[0],
          depth: targetSize[1],
          height: targetSize[2],
          unit: targetUnit,
          label: `${targetSize[0].toFixed(2)} × ${targetSize[1].toFixed(2)} × ${targetSize[2].toFixed(2)} (각재)`,
        },
      };
    }
  }

  return {
    fileName: resolvedFileName,
    fileSizeBytes: buffer.byteLength,
    detectedUnit,
    unit: targetUnit,
    meshCount: parsedMeshes.length,
    triangleCount: totalTriangles,
    aabb: {
      ...boundingBoxes.aabb,
      size: aabbSize,
    },
    obb: obbResult,
    shapeClassification,
    executionTimeMs,
  };
}


