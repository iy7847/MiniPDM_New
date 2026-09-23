/**
 * 3D CAD 모델 형상 분석 엔진: 원형(환봉/Cylinder) vs 사각(각재/Block) 자동 판별 모듈
 * D-컷(D-Cut), 키홈, 단차, 볼트 홀 가공이 적용되어 완전한 원형이 아니어도
 * 외곽 잔존 원통 곡면, 극좌표 외경 일관성, 체적 충진율을 분석하여 원소재를 정확히 판정
 */
import type { ParsedMesh, DetectedCircle } from '../workers/stepParserCore';
import type { ShapeClassification, ShapeRecommendation, CadUnit } from '../types';
import type { AABBResult, OBBResult } from './BoundingBoxCalculator';

/**
 * 삼각형 메쉬의 부호 있는 체적(Signed Volume) 계산 (발산 정리 / 사면체 분할)
 */
function computeMeshVolume(meshes: ParsedMesh[]): number {
  let totalVolume = 0;

  for (const mesh of meshes) {
    const pos = mesh.positions;
    const idx = mesh.indices;

    if (idx && idx.length > 0) {
      for (let i = 0; i < idx.length; i += 3) {
        const i1 = idx[i] * 3;
        const i2 = idx[i + 1] * 3;
        const i3 = idx[i + 2] * 3;

        const x1 = pos[i1], y1 = pos[i1 + 1], z1 = pos[i1 + 2];
        const x2 = pos[i2], y2 = pos[i2 + 1], z2 = pos[i2 + 2];
        const x3 = pos[i3], y3 = pos[i3 + 1], z3 = pos[i3 + 2];

        // 3 정점 사면체 체적: (v1 . (v2 x v3)) / 6
        totalVolume += (x1 * (y2 * z3 - y3 * z2) -
                        y1 * (x2 * z3 - x3 * z2) +
                        z1 * (x2 * y3 - x3 * y2)) / 6.0;
      }
    } else {
      for (let i = 0; i < pos.length; i += 9) {
        const x1 = pos[i], y1 = pos[i + 1], z1 = pos[i + 2];
        const x2 = pos[i + 3], y2 = pos[i + 4], z2 = pos[i + 5];
        const x3 = pos[i + 6], y3 = pos[i + 7], z3 = pos[i + 8];

        totalVolume += (x1 * (y2 * z3 - y3 * z2) -
                        y1 * (x2 * z3 - x3 * z2) +
                        z1 * (x2 * y3 - x3 * y2)) / 6.0;
      }
    }
  }

  return Math.abs(totalVolume);
}

/**
 * 3개 축(X, Y, Z) 각각에 대해 회전체(원통) 가능성 평가
 */
interface AxisEvaluation {
  axis: 'x' | 'y' | 'z';
  length: number;
  diameter: number;
  radius: number;
  radialConsistencyScore: number;
  hasMatchingCircle: boolean;
}

function evaluateAxisForCylindricalFit(
  axis: 'x' | 'y' | 'z',
  meshes: ParsedMesh[],
  aabb: AABBResult,
  detectedCircles: DetectedCircle[]
): AxisEvaluation {
  const [sizeX, sizeY, sizeZ] = aabb.size;
  const [centerX, centerY, centerZ] = aabb.center;

  let length = 0;
  let crossSize1 = 0, crossSize2 = 0;
  let axisIdx = 0, uIdx = 1, vIdx = 2;
  let centerU = 0, centerV = 0;

  if (axis === 'x') {
    length = sizeX;
    crossSize1 = sizeY;
    crossSize2 = sizeZ;
    axisIdx = 0; uIdx = 1; vIdx = 2;
    centerU = centerY; centerV = centerZ;
  } else if (axis === 'y') {
    length = sizeY;
    crossSize1 = sizeX;
    crossSize2 = sizeZ;
    axisIdx = 1; uIdx = 0; vIdx = 2;
    centerU = centerX; centerV = centerZ;
  } else {
    length = sizeZ;
    crossSize1 = sizeX;
    crossSize2 = sizeY;
    axisIdx = 2; uIdx = 0; vIdx = 1;
    centerU = centerX; centerV = centerY;
  }

  // 단면 가로세로 비율 검사 (원통/환봉은 D-컷을 치더라도 단면 비율이 최소 70% 이상이어야 함)
  const maxCross = Math.max(crossSize1, crossSize2);
  const minCross = Math.min(crossSize1, crossSize2);
  const crossRatio = minCross / maxCross;

  // 단면 가로세로 비율이 70% 미만(예: 28mm vs 66mm = 42%)이면 원통이 아니라 직사각형 평판이므로 즉시 탈락
  if (crossRatio < 0.70) {
    return {
      axis,
      length,
      diameter: Number(maxCross.toFixed(3)),
      radius: Number((maxCross / 2).toFixed(3)),
      radialConsistencyScore: 0,
      hasMatchingCircle: false,
    };
  }

  const expectedRadius = maxCross / 2.0;

  // 1. 단면 외곽 정점의 극좌표(r, theta) 샘플링
  const NUM_SECTORS = 16;
  const sectorMaxR = new Float32Array(NUM_SECTORS).fill(0);
  const sectorCounts = new Uint32Array(NUM_SECTORS).fill(0);

  let totalOuterPoints = 0;
  let pointsNearMaxR = 0;
  let maxObservedR = 0;

  for (const mesh of meshes) {
    const pos = mesh.positions;
    for (let i = 0; i < pos.length; i += 3) {
      const du = pos[i + uIdx] - centerU;
      const dv = pos[i + vIdx] - centerV;
      const r = Math.sqrt(du * du + dv * dv);

      if (r > maxObservedR) {
        maxObservedR = r;
      }

      if (r > expectedRadius * 0.7) {
        totalOuterPoints++;
        const angle = Math.atan2(dv, du); // -PI ~ PI
        const sector = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * NUM_SECTORS) % NUM_SECTORS;

        if (r > sectorMaxR[sector]) {
          sectorMaxR[sector] = r;
        }
        sectorCounts[sector]++;

        // 예상 외경 근접 정점 카운트
        if (r >= expectedRadius * 0.94 && r <= expectedRadius * 1.06) {
          pointsNearMaxR++;
        }
      }
    }
  }

  // 🛑 [핵심 기하학 판별식 1] 대각선 코너 오버행(Corner Overhang) 검사:
  // 원통은 D-컷을 치더라도 모든 정점이 원의 외경 반경(expectedRadius) 이하(r <= R)여야 함!
  // 반면 사각 블록/브라켓은 대각선 코너로 인해 r이 expectedRadius의 1.3~1.414배까지 치솟음.
  // 실제 최대 반경이 예상 반경의 12%를 초과하면 대각선 모서리를 가진 직사각형/정사각형 블록임이 100% 확실!
  if (maxObservedR > expectedRadius * 1.12) {
    return {
      axis,
      length,
      diameter: Number(maxCross.toFixed(3)),
      radius: Number((maxCross / 2).toFixed(3)),
      radialConsistencyScore: 0,
      hasMatchingCircle: false,
    };
  }

  // 🛑 [핵심 기하학 판별식 2] 섹터별 외곽 반경 변동성(Radial Ripple) 검사:
  // 원통은 원호가 있는 섹터들의 maxR이 균일함. 사각 블록은 변(1.0)과 코너(1.414) 사이에 큰 기복이 생김.
  let validSectorsCount = 0;
  let sumR = 0;
  for (let s = 0; s < NUM_SECTORS; s++) {
    if (sectorCounts[s] > 0 && sectorMaxR[s] > expectedRadius * 0.75) {
      validSectorsCount++;
      sumR += sectorMaxR[s];
    }
  }

  if (validSectorsCount >= 6) {
    const meanR = sumR / validSectorsCount;
    let variance = 0;
    for (let s = 0; s < NUM_SECTORS; s++) {
      if (sectorCounts[s] > 0 && sectorMaxR[s] > expectedRadius * 0.75) {
        const diff = (sectorMaxR[s] - meanR) / meanR;
        variance += diff * diff;
      }
    }
    const stdDevRatio = Math.sqrt(variance / validSectorsCount);
    // 변동 계수가 10% 이상이면 원형이 아니라 사각 블록의 외곽 기복임
    if (stdDevRatio > 0.10) {
      return {
        axis,
        length,
        diameter: Number(maxCross.toFixed(3)),
        radius: Number((maxCross / 2).toFixed(3)),
        radialConsistencyScore: 0,
        hasMatchingCircle: false,
      };
    }
  }

  // 외경(expectedRadius)의 94%~106%에 도달하는 섹터 수 카운트
  let sectorsNearPeak = 0;
  let activeSectors = 0;
  for (let s = 0; s < NUM_SECTORS; s++) {
    if (sectorCounts[s] > 0) {
      activeSectors++;
      if (sectorMaxR[s] >= expectedRadius * 0.94 && sectorMaxR[s] <= expectedRadius * 1.06) {
        sectorsNearPeak++;
      }
    }
  }

  const sectorPeakRatio = activeSectors > 0 ? sectorsNearPeak / activeSectors : 0;
  const pointPeakRatio = totalOuterPoints > 0 ? pointsNearMaxR / totalOuterPoints : 0;

  // 2. 검출된 원호(Detected Circles)와 해당 축의 일치 여부 및 중심 편심(Eccentricity) 검사
  let hasMatchingCircle = false;
  for (const c of detectedCircles) {
    const axisNormal = Math.abs(c.normal[axisIdx]);
    const radiusRatio = c.radius / expectedRadius;

    const dCenterU = c.center[uIdx] - centerU;
    const dCenterV = c.center[vIdx] - centerV;
    const eccentricity = Math.sqrt(dCenterU * dCenterU + dCenterV * dCenterV);

    // 중심 일치율(편심률 20% 이내) 및 반경 일치율(80%~105%) 만족 시에만 인정
    if (axisNormal > 0.88 && radiusRatio >= 0.80 && radiusRatio <= 1.05 && eccentricity < expectedRadius * 0.20) {
      hasMatchingCircle = true;
      break;
    }
  }

  // 3. 종합 극좌표 일관성 점수 산출
  let consistencyScore = 0;
  
  if (sectorPeakRatio >= 0.50) {
    consistencyScore += 0.45 + (sectorPeakRatio * 0.35);
  }
  if (pointPeakRatio >= 0.25) {
    consistencyScore += 0.2;
  }
  if (hasMatchingCircle) {
    consistencyScore += 0.35;
  }

  // 단면 비율 패널티
  if (crossRatio < 0.85) {
    consistencyScore *= Math.pow(crossRatio / 0.85, 3);
  }

  return {
    axis,
    length,
    diameter: Number((maxCross).toFixed(3)),
    radius: Number((expectedRadius).toFixed(3)),
    radialConsistencyScore: Math.min(1.0, consistencyScore),
    hasMatchingCircle,
  };
}


/**
 * CAD 모델의 원소재 형상(원형 환봉 vs 사각 각재)을 판별하는 메인 함수
 * 
 * @param meshes 파싱된 메쉬 배열
 * @param aabb 전역 좌표축 정렬 바운딩 박스
 * @param obb 최소 체적 회전 바운딩 박스 (옵션)
 * @param detectedCircles 검출된 원호 피처 목록
 * @param unit 표기 단위 ('mm' | 'in')
 */
export function classifyPartShape(
  meshes: ParsedMesh[],
  aabb: AABBResult,
  obb: OBBResult | undefined,
  detectedCircles: DetectedCircle[] = [],
  unit: CadUnit = 'mm'
): ShapeClassification {
  const [sizeX, sizeY, sizeZ] = aabb.size;
  const boxVolume = aabb.volume || (sizeX * sizeY * sizeZ);
  const meshVolume = computeMeshVolume(meshes);
  const volumeRatio = boxVolume > 0 ? meshVolume / boxVolume : 0;

  // 0. 평판 플레이트/브라켓/링크 형상 검사 (Thin Plate Check)
  // 3개 치수 중 두께가 얇고, 평면 상의 가로세로가 비대칭인 판재 부품 감지
  const sortedDims = [...aabb.size].sort((a, b) => a - b);
  const thickness = sortedDims[0];
  const midDim = sortedDims[1];
  const maxDim = sortedDims[2];

  const thicknessRatio = thickness / midDim;
  const plateAspectRatio = midDim / maxDim;

  // 두께가 폭의 35% 이하로 얇고, 평면 형상이 직사각형(종횡비 75% 미만)인 경우 100% 각재/플레이트
  const isThinPlate = thicknessRatio <= 0.35 && plateAspectRatio < 0.75;

  if (isThinPlate) {
    const targetSize = obb ? obb.size : aabb.size;
    return {
      shapeType: 'box',
      confidence: 0.95,
      recommendation: {
        type: 'block',
        label: `${targetSize[0].toFixed(2)} × ${targetSize[1].toFixed(2)} × ${targetSize[2].toFixed(2)} (각재)`,
        width: targetSize[0],
        depth: targetSize[1],
        height: targetSize[2],
        unit,
      },
      details: {
        circularityScore: 0,
        hasCircularFeature: false,
        volumeFillRatio: Number(volumeRatio.toFixed(3)),
        reason: `평판 플레이트 형상 감지 (두께 ${(thickness).toFixed(1)}${unit}, 가로세로비 ${(plateAspectRatio * 100).toFixed(1)}%)`,
      },
    };
  }

  // 1. X, Y, Z 세 축에 대해 회전체 일치도 평가
  const evalX = evaluateAxisForCylindricalFit('x', meshes, aabb, detectedCircles);
  const evalY = evaluateAxisForCylindricalFit('y', meshes, aabb, detectedCircles);
  const evalZ = evaluateAxisForCylindricalFit('z', meshes, aabb, detectedCircles);

  const evals = [evalX, evalY, evalZ];
  evals.sort((a, b) => b.radialConsistencyScore - a.radialConsistencyScore);
  const bestAxis = evals[0];

  // 2. 부피 충진율(Volume Fill Ratio) 평가
  const isCylinderVolumeRange = volumeRatio <= 0.85 && volumeRatio >= 0.35;

  // 3. 종합 신뢰도 점수 산출
  let circularScore = bestAxis.radialConsistencyScore;

  if (bestAxis.hasMatchingCircle) {
    circularScore += 0.25;
  }
  if (isCylinderVolumeRange && bestAxis.radialConsistencyScore > 0.4) {
    circularScore += 0.15;
  }
  if (volumeRatio > 0.90) {
    circularScore -= 0.50;
  }

  const confidence = Math.max(0.1, Math.min(0.99, circularScore));
  // 회전체 판정: 종합 원형 점수가 0.65 이상이고, 중심축의 외곽 원통 일치도가 0.50 이상일 때만 환봉으로 판정
  const isRound = circularScore >= 0.65 && bestAxis.radialConsistencyScore >= 0.50;

  // 4. 추천 소재 규격 산출
  let recommendation: ShapeRecommendation;

  if (isRound) {
    const dia = bestAxis.diameter;
    const len = bestAxis.length;
    recommendation = {
      type: 'round_bar',
      label: `Ø ${dia.toFixed(2)} × ${len.toFixed(2)} L (환봉)`,
      diameter: dia,
      length: len,
      unit,
    };
  } else {
    // 사각 각재는 OBB가 있으면 최적 OBB 치수 우선, 없으면 AABB 치수 사용
    const targetSize = obb ? obb.size : aabb.size;
    recommendation = {
      type: 'block',
      label: `${targetSize[0].toFixed(2)} × ${targetSize[1].toFixed(2)} × ${targetSize[2].toFixed(2)} (각재)`,
      width: targetSize[0],
      depth: targetSize[1],
      height: targetSize[2],
      unit,
    };
  }

  // 5. 판정 사유 생성
  let reason = '';
  if (isRound) {
    const reasons: string[] = [];
    if (bestAxis.hasMatchingCircle) reasons.push('외곽 원호(동심원) 검출');
    if (bestAxis.radialConsistencyScore >= 0.5) reasons.push(`${bestAxis.axis.toUpperCase()}축 기준 외곽 원통 곡면 일치`);
    if (isCylinderVolumeRange) reasons.push(`원통형 체적 충진율(${(volumeRatio * 100).toFixed(1)}%)`);
    reason = reasons.join(', ') || '원형 가공 소재로 판정됨';
  } else {
    if (volumeRatio >= 0.90) {
      reason = `직육면체 체적 충진율(${(volumeRatio * 100).toFixed(1)}%) 및 사각 외곽 형상`;
    } else {
      reason = '외곽 원통 곡면 미검출 (사각 블록 기반 가공품)';
    }
  }

  return {
    shapeType: isRound ? 'round' : 'box',
    confidence: Number(confidence.toFixed(2)),
    recommendation,
    details: {
      axis: bestAxis.axis,
      circularityScore: Number(bestAxis.radialConsistencyScore.toFixed(2)),
      hasCircularFeature: bestAxis.hasMatchingCircle,
      volumeFillRatio: Number(volumeRatio.toFixed(3)),
      reason,
    },
  };
}
