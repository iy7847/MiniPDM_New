/**
 * STP/STEP 파일 지오메트리 파싱 및 원호/치수 메타데이터 추출 코어 로직
 */
export interface ParsedMesh {
  name: string;
  color?: [number, number, number];
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export interface DetectedCircle {
  id: string;
  center: [number, number, number];
  radius: number;
  diameter: number;
  normal: [number, number, number];
  edgePoints: Float32Array;
}

export interface ParseResultData {
  meshes: ParsedMesh[];
  detectedCircles: DetectedCircle[];
  metadata: {
    boundingBox: {
      min: [number, number, number];
      max: [number, number, number];
      size: [number, number, number];
    };
    meshCount: number;
    triangleCount: number;
    fileName: string;
    fileSizeBytes: number;
    detectedUnit?: 'in' | 'mm';
    unitScale?: number;
  };
}

/**
 * STP/STEP 파일 텍스트 헤더에서 원본 설계 단위 자동 감지
 * ISO 10303 규격의 CONVERSION_BASED_UNIT / SI_UNIT 분석
 */
export function detectStepUnit(buffer: ArrayBuffer): { unit: 'in' | 'mm'; scaleFromMm: number } {
  try {
    const decoder = new TextDecoder('utf-8');
    // 헤더 및 단위 정의가 위치한 앞부분 500KB 검사
    const text = decoder.decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 500000)));

    // 1. INCH (인치) 검출
    if (/CONVERSION_BASED_UNIT\s*\(\s*['"]INCH['"]/i.test(text)) {
      return { unit: 'in', scaleFromMm: 1 / 25.4 };
    }

    // 2. MILLIMETER (밀리미터) 검출
    if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)/i.test(text)) {
      return { unit: 'mm', scaleFromMm: 1.0 };
    }
  } catch (e) {
    console.warn('STP 단위 자동 감지 실패:', e);
  }
  return { unit: 'mm', scaleFromMm: 1.0 };
}

/// 엣지 루프에서 원형 홀 및 모따기 원호를 정밀 검출하는 알고리즘
export function detectCircularEdges(positions: Float32Array, indices: Uint32Array): DetectedCircle[] {
  const circles: DetectedCircle[] = [];

  // 1. 공간 정점 병합 (0.01mm 해상도 양자화)
  // 면 분할로 인해 동일 좌표의 정점이 다른 인덱스로 쪼개진 경우를 하나의 노드로 매핑
  const posMap = new Map<string, number>();
  const vRemap = new Int32Array(indices.length);
  const uniquePositions: [number, number, number][] = [];

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    const key = `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`;
    let uid = posMap.get(key);
    if (uid === undefined) {
      uid = uniquePositions.length;
      posMap.set(key, uid);
      uniquePositions.push([x, y, z]);
    }
  }

  for (let i = 0; i < indices.length; i++) {
    const origIdx = indices[i];
    const x = positions[origIdx * 3];
    const y = positions[origIdx * 3 + 1];
    const z = positions[origIdx * 3 + 2];
    const key = `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`;
    vRemap[i] = posMap.get(key)!;
  }

  // 2. 삼각형별 평면 법선 계산
  const triNormals: [number, number, number][] = [];
  const triCount = indices.length / 3;

  for (let t = 0; t < triCount; t++) {
    const i1 = indices[t * 3] * 3;
    const i2 = indices[t * 3 + 1] * 3;
    const i3 = indices[t * 3 + 2] * 3;

    const ax = positions[i2] - positions[i1];
    const ay = positions[i2 + 1] - positions[i1 + 1];
    const az = positions[i2 + 2] - positions[i1 + 2];

    const bx = positions[i3] - positions[i1];
    const by = positions[i3 + 1] - positions[i1 + 1];
    const bz = positions[i3 + 2] - positions[i1 + 2];

    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-6) {
      nx /= len; ny /= len; nz /= len;
    }
    triNormals.push([nx, ny, nz]);
  }

  // 3. 엣지 매핑 및 인접 삼각형 수집
  const edgeMap = new Map<string, { a: number; b: number; tris: number[] }>();
  for (let t = 0; t < triCount; t++) {
    const u1 = vRemap[t * 3];
    const u2 = vRemap[t * 3 + 1];
    const u3 = vRemap[t * 3 + 2];

    const edges = [
      [Math.min(u1, u2), Math.max(u1, u2)],
      [Math.min(u2, u3), Math.max(u2, u3)],
      [Math.min(u3, u1), Math.max(u3, u1)],
    ];

    for (const [a, b] of edges) {
      if (a === b) continue;
      const key = `${a}_${b}`;
      let entry = edgeMap.get(key);
      if (!entry) {
        entry = { a, b, tris: [] };
        edgeMap.set(key, entry);
      }
      entry.tris.push(t);
    }
  }

  // 4. 피처 엣지(Sharp Edge) 추출: 외곽 경계선(tris.length === 1) 또는 법선 각도 차이 18도 이상(내적 < 0.95)
  // (모따기 경사면과 외경 원통면이 만나는 45도 꺾임선도 완벽 수집!)
  const featureEdges: { a: number; b: number }[] = [];
  edgeMap.forEach((e) => {
    if (e.tris.length === 1) {
      featureEdges.push(e);
    } else if (e.tris.length === 2) {
      const n1 = triNormals[e.tris[0]];
      const n2 = triNormals[e.tris[1]];
      const dot = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];
      if (dot < 0.95) {
        featureEdges.push(e);
      }
    }
  });

  // 5. 인접 그래프 구축
  const adjacency = new Map<number, number[]>();
  featureEdges.forEach((e) => {
    if (!adjacency.has(e.a)) adjacency.set(e.a, []);
    if (!adjacency.has(e.b)) adjacency.set(e.b, []);
    adjacency.get(e.a)!.push(e.b);
    adjacency.get(e.b)!.push(e.a);
  });

  // 6. 닫힌 순환 루프(Closed Loops) 추적
  const visited = new Set<number>();
  const loops: number[][] = [];

  adjacency.forEach((_, startNode) => {
    if (visited.has(startNode)) return;

    const currentLoop: number[] = [];
    let curr: number | null = startNode;
    let prev: number | null = null;

    while (curr !== null && !visited.has(curr)) {
      visited.add(curr);
      currentLoop.push(curr);

      const neighbors: number[] = adjacency.get(curr) || [];
      const next: number | undefined = neighbors.find((n: number) => n !== prev && !visited.has(n));
      prev = curr;
      curr = next !== undefined ? next : null;
    }

    if (currentLoop.length >= 6) {
      // 시작점과 연결되어 닫힌 루프인지 검증
      const lastNode = currentLoop[currentLoop.length - 1];
      const isClosed = (adjacency.get(lastNode) || []).includes(currentLoop[0]);
      if (isClosed) {
        loops.push(currentLoop);
      }
    }
  });

  // 7. 평면성(Planarity) 검사 및 2D 투영 Kåsa 원형 피팅
  loops.forEach((loop, loopIdx) => {
    const points = loop.map((idx) => uniquePositions[idx]);

    // A. 뉴웰(Newell) 공식으로 평면 단위 법선 벡터 산출
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < points.length; i++) {
      const cur = points[i];
      const next = points[(i + 1) % points.length];
      nx += (cur[1] - next[1]) * (cur[2] + next[2]);
      ny += (cur[2] - next[2]) * (cur[0] + next[0]);
      nz += (cur[0] - next[0]) * (cur[1] + next[1]);
    }
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-6) return;
    nx /= len; ny /= len; nz /= len;

    // B. 정점들의 3D 무게중심
    let cx = 0, cy = 0, cz = 0;
    for (const p of points) {
      cx += p[0]; cy += p[1]; cz += p[2];
    }
    cx /= points.length;
    cy /= points.length;
    cz /= points.length;

    // C. 🛑 [핵심 평면성 필터] 3D 정점들이 단일 평면에 누워 있는지 엄격 검사
    // 비틀린 3D 경로(Saddle curve / 지그재그 모서리)는 평면 이탈 거리가 크므로 즉시 탈락!
    let maxPlaneDist = 0;
    for (const p of points) {
      const d = Math.abs((p[0] - cx) * nx + (p[1] - cy) * ny + (p[2] - cz) * nz);
      if (d > maxPlaneDist) maxPlaneDist = d;
    }
    if (maxPlaneDist > 0.15) return;

    // D. 평면 2D 직교 기저(u, v) 생성
    let ux = 1, uy = 0, uz = 0;
    if (Math.abs(nx) > 0.9) {
      ux = 0; uy = 1; uz = 0;
    }
    // v = n x u
    let vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
    let vlen = Math.hypot(vx, vy, vz);
    vx /= vlen; vy /= vlen; vz /= vlen;
    // u = v x n
    ux = vy * nz - vz * ny; uy = vz * nx - vx * nz; uz = vx * ny - vy * nx;

    // E. 정점들의 2D 평면 투영 좌표
    const pts2d = points.map((p) => {
      const dx = p[0] - cx, dy = p[1] - cy, dz = p[2] - cz;
      return [dx * ux + dy * uy + dz * uz, dx * vx + dy * vy + dz * vz];
    });

    // F. 최소자승법(Kåsa Method) 원형 피팅: 원래 CAD의 수학적 중심과 반경 정밀 복원
    let sumU = 0, sumV = 0, sumU2 = 0, sumV2 = 0, sumUV = 0;
    let sumU3 = 0, sumV3 = 0, sumUV2 = 0, sumU2V = 0;
    const N = pts2d.length;

    for (const [u, v] of pts2d) {
      const u2 = u * u, v2 = v * v;
      sumU += u; sumV += v;
      sumU2 += u2; sumV2 += v2; sumUV += u * v;
      sumU3 += u * u2; sumV3 += v * v2;
      sumUV2 += u * v2; sumU2V += u2 * v;
    }

    const matA = N * sumU2 - sumU * sumU;
    const matB = N * sumUV - sumU * sumV;
    const matC = N * sumV2 - sumV * sumV;
    const matD = 0.5 * (N * (sumU3 + sumUV2) - sumU * (sumU2 + sumV2));
    const matE = 0.5 * (N * (sumU2V + sumV3) - sumV * (sumU2 + sumV2));

    const denom = matA * matC - matB * matB;
    if (Math.abs(denom) < 1e-6) return;

    const fitUc = (matD * matC - matB * matE) / denom;
    const fitVc = (matA * matE - matB * matD) / denom;
    const fitR = Math.sqrt(Math.max(0, fitUc * fitUc + fitVc * fitVc + (sumU2 + sumV2 - 2 * fitUc * sumU - 2 * fitVc * sumV) / N));

    // 유효 직경 범위 (0.5mm ~ 800mm)
    if (fitR < 0.5 || fitR > 800) return;

    // G. 피팅 오차(진원도 편차) 검사: 테셀레이션 다각형 오차(3~5%)를 수용할 수 있도록 6% 이내 허용
    let maxDev = 0;
    for (const [u, v] of pts2d) {
      const dist = Math.hypot(u - fitUc, v - fitVc);
      const dev = Math.abs(dist - fitR) / fitR;
      if (dev > maxDev) maxDev = dev;
    }

    if (maxDev < 0.06) {
      const actualCenterX = cx + fitUc * ux + fitVc * vx;
      const actualCenterY = cy + fitUc * uy + fitVc * vy;
      const actualCenterZ = cz + fitUc * uz + fitVc * vz;

      const edgePoints = new Float32Array(points.length * 3);
      for (let i = 0; i < points.length; i++) {
        edgePoints[i * 3] = points[i][0];
        edgePoints[i * 3 + 1] = points[i][1];
        edgePoints[i * 3 + 2] = points[i][2];
      }

      circles.push({
        id: `circle_${loopIdx}`,
        center: [Number(actualCenterX.toFixed(3)), Number(actualCenterY.toFixed(3)), Number(actualCenterZ.toFixed(3))],
        radius: Number(fitR.toFixed(3)),
        diameter: Number((fitR * 2).toFixed(3)),
        normal: [Number(nx.toFixed(4)), Number(ny.toFixed(4)), Number(nz.toFixed(4))],
        edgePoints,
      });
    }
  });

  return circles;
}

// OCCT 파싱 결과 객체를 Three.js 친화적 데이터로 정제하는 함수
export function processOcctResult(result: any, buffer: ArrayBuffer, fileName: string): ParseResultData {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let totalTriangles = 0;

  // 원본 설계 단위 자동 감지
  const unitInfo = detectStepUnit(buffer);

  const parsedMeshes: ParsedMesh[] = [];
  const detectedCircles: DetectedCircle[] = [];

  for (const mesh of result.meshes) {
    const posArray = new Float32Array(mesh.attributes.position.array);
    const normArray = mesh.attributes.normal
      ? new Float32Array(mesh.attributes.normal.array)
      : new Float32Array(posArray.length);
    const idxArray = new Uint32Array(mesh.index.array);

    totalTriangles += idxArray.length / 3;

    for (let i = 0; i < posArray.length; i += 3) {
      const x = posArray[i];
      const y = posArray[i + 1];
      const z = posArray[i + 2];

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;

      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    const meshCircles = detectCircularEdges(posArray, idxArray);
    detectedCircles.push(...meshCircles);

    parsedMeshes.push({
      name: mesh.name || 'Part',
      color: mesh.color ? [mesh.color[0], mesh.color[1], mesh.color[2]] : undefined,
      positions: posArray,
      normals: normArray,
      indices: idxArray,
    });
  }

  const uniqueCircles: DetectedCircle[] = [];
  for (const c of detectedCircles) {
    const isDuplicate = uniqueCircles.some((u) => {
      const dist = Math.hypot(u.center[0] - c.center[0], u.center[1] - c.center[1], u.center[2] - c.center[2]);
      const radiusDiff = Math.abs(u.radius - c.radius);
      return dist < 0.2 && radiusDiff < 0.1;
    });
    if (!isDuplicate) {
      uniqueCircles.push(c);
    }
  }

  const sizeX = Number((maxX - minX).toFixed(2));
  const sizeY = Number((maxY - minY).toFixed(2));
  const sizeZ = Number((maxZ - minZ).toFixed(2));

  return {
    meshes: parsedMeshes,
    detectedCircles: uniqueCircles,
    metadata: {
      boundingBox: {
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ],
        size: [sizeX, sizeY, sizeZ],
      },
      meshCount: parsedMeshes.length,
      triangleCount: totalTriangles,
      fileName,
      fileSizeBytes: buffer.byteLength,
      detectedUnit: unitInfo.unit,
      unitScale: unitInfo.scaleFromMm,
    },
  };
}
