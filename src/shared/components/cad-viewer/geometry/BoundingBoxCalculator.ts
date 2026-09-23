/**
 * 3D CAD 모델 바운딩 박스(AABB 및 최소 체적 OBB) 계산 모듈
 */
import * as THREE from 'three';
import type { ParsedMesh, DetectedCircle } from '../workers/stepParserCore';
import type { ShapeClassification } from '../types';
import { classifyPartShape } from './ShapeClassifier';

export type BoundingBoxMode = 'none' | 'aabb' | 'obb';

export interface AABBResult {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
  center: [number, number, number];
  volume: number;
}

export interface OBBResult {
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

export interface BoundingBoxSuite {
  aabb: AABBResult;
  obb: OBBResult;
  shape?: ShapeClassification; // 원형(환봉) vs 사각(각재) 소재 형상 판정 결과
}

/**
 * 대칭 3x3 공분산 행렬의 고유벡터(Eigenvectors)를 구하는 자코비(Jacobi) 회전 알고리즘
 */
function computeEigenvectors3x3(cov: number[][]): THREE.Vector3[] {
  // A = cov 복사
  const A = cov.map((row) => [...row]);
  // V = 3x3 단위 행렬
  const V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  const maxIter = 25;
  for (let iter = 0; iter < maxIter; iter++) {
    // 비대각 원소 중 최대값 탐색
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const absVal = Math.abs(A[i][j]);
        if (absVal > maxVal) {
          maxVal = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < 1e-7) break;

    // 회전각 계산
    const app = A[p][p];
    const aqq = A[q][q];
    const apq = A[p][q];
    const theta = (aqq - app) / (2 * apq);
    const t = theta >= 0 ? 1 / (theta + Math.sqrt(theta * theta + 1)) : -1 / (-theta + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;

    // A 행렬 업데이트
    A[p][p] = app - t * apq;
    A[q][q] = aqq + t * apq;
    A[p][q] = 0;
    A[q][p] = 0;

    for (let i = 0; i < 3; i++) {
      if (i !== p && i !== q) {
        const aip = A[i][p];
        const aiq = A[i][q];
        A[i][p] = c * aip - s * aiq;
        A[p][i] = A[i][p];
        A[i][q] = s * aip + c * aiq;
        A[q][i] = A[i][q];
      }
    }

    // 고유벡터 행렬 V 업데이트
    for (let i = 0; i < 3; i++) {
      const vip = V[i][p];
      const viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }

  // 3개 열 벡터 추출 및 정규화
  const e1 = new THREE.Vector3(V[0][0], V[1][0], V[2][0]).normalize();
  const e2 = new THREE.Vector3(V[0][1], V[1][1], V[2][1]).normalize();
  const e3 = new THREE.Vector3().crossVectors(e1, e2).normalize();
  return [e1, e2, e3];
}

/**
 * 주어진 직교 기저 (u, v, w)를 축으로 정점들을 투영하여 바운딩 박스 크기 및 중심 계산
 */
function evaluateOrientation(
  points: THREE.Vector3[],
  u: THREE.Vector3,
  v: THREE.Vector3,
  w: THREE.Vector3
): { center: THREE.Vector3; size: THREE.Vector3; volume: number } {
  let minU = Infinity, maxU = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  let minW = Infinity, maxW = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const du = p.dot(u);
    const dv = p.dot(v);
    const dw = p.dot(w);

    if (du < minU) minU = du;
    if (du > maxU) maxU = du;
    if (dv < minV) minV = dv;
    if (dv > maxV) maxV = dv;
    if (dw < minW) minW = dw;
    if (dw > maxW) maxW = dw;
  }

  const sU = Math.max(0.001, maxU - minU);
  const sV = Math.max(0.001, maxV - minV);
  const sW = Math.max(0.001, maxW - minW);

  const cU = (minU + maxU) * 0.5;
  const cV = (minV + maxV) * 0.5;
  const cW = (minW + maxW) * 0.5;

  const center = new THREE.Vector3()
    .addScaledVector(u, cU)
    .addScaledVector(v, cV)
    .addScaledVector(w, cW);

  return {
    center,
    size: new THREE.Vector3(sU, sV, sW),
    volume: sU * sV * sW,
  };
}

/**
 * 3D CAD 메쉬 정점들로부터 AABB와 최소 체적 OBB를 계산
 */
export function calculateBoundingBoxes(
  meshes: ParsedMesh[],
  detectedCircles: DetectedCircle[] = []
): BoundingBoxSuite {
  // 1. 모든 메쉬 정점 수집
  let totalVerts = 0;
  for (const m of meshes) {
    totalVerts += m.positions.length / 3;
  }

  const samplePoints: THREE.Vector3[] = [];
  const allPoints: THREE.Vector3[] = [];
  const sampleStride = Math.max(1, Math.floor(totalVerts / 3000)); // PCA용 최대 3,000개 샘플링

  let idx = 0;
  for (const m of meshes) {
    const pos = m.positions;
    for (let i = 0; i < pos.length; i += 3) {
      const pt = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]);
      allPoints.push(pt);
      if (idx % sampleStride === 0) {
        samplePoints.push(pt);
      }
      idx++;
    }
  }

  if (allPoints.length === 0) {
    return {
      aabb: { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0], center: [0, 0, 0], volume: 0 },
      obb: {
        center: [0, 0, 0],
        size: [0, 0, 0],
        quaternion: [0, 0, 0, 1],
        axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        volume: 0,
        volumeSavingsPercent: 0,
      },
    };
  }

  // 2. AABB (축 정렬 바운딩 박스) 계산
  const baseAABB = evaluateOrientation(
    allPoints,
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1)
  );

  const aabbMin: [number, number, number] = [
    Number((baseAABB.center.x - baseAABB.size.x * 0.5).toFixed(2)),
    Number((baseAABB.center.y - baseAABB.size.y * 0.5).toFixed(2)),
    Number((baseAABB.center.z - baseAABB.size.z * 0.5).toFixed(2)),
  ];
  const aabbMax: [number, number, number] = [
    Number((baseAABB.center.x + baseAABB.size.x * 0.5).toFixed(2)),
    Number((baseAABB.center.y + baseAABB.size.y * 0.5).toFixed(2)),
    Number((baseAABB.center.z + baseAABB.size.z * 0.5).toFixed(2)),
  ];

  const aabbResult: AABBResult = {
    min: aabbMin,
    max: aabbMax,
    size: [
      Number(baseAABB.size.x.toFixed(2)),
      Number(baseAABB.size.y.toFixed(2)),
      Number(baseAABB.size.z.toFixed(2)),
    ],
    center: [
      Number(baseAABB.center.x.toFixed(2)),
      Number(baseAABB.center.y.toFixed(2)),
      Number(baseAABB.center.z.toFixed(2)),
    ],
    volume: Number(baseAABB.volume.toFixed(2)),
  };

  // 3. OBB 후보 직교 기저축 생성
  const candidateBases: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [];

  // 후보 1: AABB 기본 축 (최소 OBB의 상한선 보장)
  candidateBases.push([new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]);

  // 후보 2: PCA(주성분 분석) 기반 주축
  if (samplePoints.length >= 6) {
    const mean = new THREE.Vector3();
    for (const p of samplePoints) mean.add(p);
    mean.multiplyScalar(1 / samplePoints.length);

    const cov = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (const p of samplePoints) {
      const dx = p.x - mean.x;
      const dy = p.y - mean.y;
      const dz = p.z - mean.z;
      cov[0][0] += dx * dx;
      cov[0][1] += dx * dy;
      cov[0][2] += dx * dz;
      cov[1][1] += dy * dy;
      cov[1][2] += dy * dz;
      cov[2][2] += dz * dz;
    }
    cov[1][0] = cov[0][1];
    cov[2][0] = cov[0][2];
    cov[2][1] = cov[1][2];

    const pcaBases = computeEigenvectors3x3(cov);
    candidateBases.push([pcaBases[0], pcaBases[1], pcaBases[2]]);

    // 주축 중심 회전 후보들 (15도, 30도, 45도, 60도, 75도)
    const angles = [15, 30, 45, 60, 75];
    for (const ang of angles) {
      const rad = THREE.MathUtils.degToRad(ang);
      const rotQ = new THREE.Quaternion().setFromAxisAngle(pcaBases[0], rad);
      const v2 = pcaBases[1].clone().applyQuaternion(rotQ).normalize();
      const v3 = pcaBases[2].clone().applyQuaternion(rotQ).normalize();
      candidateBases.push([pcaBases[0], v2, v3]);
    }
  }

  // 후보 3: 원통(홀) 축 방향 기반 직교 기저
  for (const c of detectedCircles.slice(0, 8)) {
    const norm = new THREE.Vector3(...c.normal).normalize();
    const tempUp = Math.abs(norm.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const side = new THREE.Vector3().crossVectors(norm, tempUp).normalize();
    const up = new THREE.Vector3().crossVectors(side, norm).normalize();

    candidateBases.push([norm, side, up]);
    // 45도 회전 기저
    const rot45 = new THREE.Quaternion().setFromAxisAngle(norm, Math.PI / 4);
    candidateBases.push([norm, side.clone().applyQuaternion(rot45).normalize(), up.clone().applyQuaternion(rot45).normalize()]);
  }

  // 4. 모든 후보 기저 중 체적(Volume)이 가장 작은 최적 OBB 선택
  let bestVolume = baseAABB.volume;
  let bestCenter = baseAABB.center;
  let bestSize = baseAABB.size;
  let bestBasis: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = candidateBases[0];

  for (const [u, v, w] of candidateBases) {
    const evalRes = evaluateOrientation(allPoints, u, v, w);
    if (evalRes.volume < bestVolume) {
      bestVolume = evalRes.volume;
      bestCenter = evalRes.center;
      bestSize = evalRes.size;
      bestBasis = [u, v, w];
    }
  }

  // 회전 쿼터니언 계산
  const rotMat = new THREE.Matrix4().makeBasis(bestBasis[0], bestBasis[1], bestBasis[2]);
  const quat = new THREE.Quaternion().setFromRotationMatrix(rotMat);

  // 부피 절감율 (%)
  const savings = Math.max(0, Number((((baseAABB.volume - bestVolume) / baseAABB.volume) * 100).toFixed(1)));

  const obbResult: OBBResult = {
    center: [
      Number(bestCenter.x.toFixed(2)),
      Number(bestCenter.y.toFixed(2)),
      Number(bestCenter.z.toFixed(2)),
    ],
    size: [
      Number(bestSize.x.toFixed(2)),
      Number(bestSize.y.toFixed(2)),
      Number(bestSize.z.toFixed(2)),
    ],
    quaternion: [quat.x, quat.y, quat.z, quat.w],
    axes: [
      [Number(bestBasis[0].x.toFixed(3)), Number(bestBasis[0].y.toFixed(3)), Number(bestBasis[0].z.toFixed(3))],
      [Number(bestBasis[1].x.toFixed(3)), Number(bestBasis[1].y.toFixed(3)), Number(bestBasis[1].z.toFixed(3))],
      [Number(bestBasis[2].x.toFixed(3)), Number(bestBasis[2].y.toFixed(3)), Number(bestBasis[2].z.toFixed(3))],
    ],
    volume: Number(bestVolume.toFixed(2)),
    volumeSavingsPercent: savings,
  };

  // 원소재 형상(원형 환봉 vs 사각 각재) 자동 판별
  const shape = classifyPartShape(meshes, aabbResult, obbResult, detectedCircles);

  return {
    aabb: aabbResult,
    obb: obbResult,
    shape,
  };
}

