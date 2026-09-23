/**
 * CAD 스마트 치수 계산기 (홀 직경, 중심간 거리, 면간 거리, 점-면 거리 지능형 산출)
 */
import * as THREE from 'three';
import type { SnapElement, MeasurementItem, MeasurementType } from '../types';

export class DimensionCalculator {
  /**
   * 단일 요소(원/홀) 선택 시 치수 생성
   */
  public static calculateSingle(snap: SnapElement): MeasurementItem | null {
    if (snap.type === 'circle' && snap.diameter !== undefined && snap.radius !== undefined) {
      return {
        id: `m_hole_${Date.now()}`,
        type: 'hole',
        value: snap.diameter,
        label: `Ø ${snap.diameter.toFixed(2)} mm (R ${snap.radius.toFixed(2)})`,
        startPoint: snap.point,
        endPoint: snap.point,
        snapA: snap,
      };
    }
    return null;
  }

  /**
   * 두 요소(A, B) 선택 시 기하학적 관계를 자동 판별하여 최적의 치수 생성
   */
  public static calculatePair(snapA: SnapElement, snapB: SnapElement): MeasurementItem {
    const pA = new THREE.Vector3(...snapA.point);
    const pB = new THREE.Vector3(...snapB.point);

    const dx = Math.abs(pB.x - pA.x);
    const dy = Math.abs(pB.y - pA.y);
    const dz = Math.abs(pB.z - pA.z);
    const directDist = pA.distanceTo(pB);

    // 1. [중심과 중심의 거리 (Center-to-Center)]
    // 두 요소가 모두 원/원통인 경우
    if (snapA.type === 'circle' && snapB.type === 'circle' && snapA.radius && snapB.radius) {
      const cA = new THREE.Vector3(...(snapA.center || snapA.point));
      const cB = new THREE.Vector3(...(snapB.center || snapB.point));
      const centerDist = cA.distanceTo(cB);

      const innerDist = Math.max(0, centerDist - (snapA.radius + snapB.radius));
      const outerDist = centerDist + (snapA.radius + snapB.radius);

      return {
        id: `m_c2c_${Date.now()}`,
        type: 'center_to_center',
        value: Number(centerDist.toFixed(2)),
        label: `중심간 ${centerDist.toFixed(2)} mm`,
        circleOption: 'center',
        details: {
          dx: Number(dx.toFixed(2)),
          dy: Number(dy.toFixed(2)),
          dz: Number(dz.toFixed(2)),
          innerDist: Number(innerDist.toFixed(2)),
          outerDist: Number(outerDist.toFixed(2)),
        },
        startPoint: [cA.x, cA.y, cA.z],
        endPoint: [cB.x, cB.y, cB.z],
        snapA,
        snapB,
      };
    }

    // 2. [면과 면의 거리 (Plane-to-Plane)]
    // 두 요소가 모두 평면인 경우
    if (snapA.type === 'plane' && snapB.type === 'plane' && snapA.normal && snapB.normal) {
      const nA = new THREE.Vector3(...snapA.normal).normalize();
      const nB = new THREE.Vector3(...snapB.normal).normalize();

      // 두 법선의 내적 검사 (평행 여부 판별)
      const dot = Math.abs(nA.dot(nB));

      if (dot >= 0.95) {
        // 평행한 두 평면 사이의 수직 최단 거리 계산
        const vDiff = new THREE.Vector3().subVectors(pA, pB);
        const perpDist = Math.abs(vDiff.dot(nB));

        // 평면 B 상에 점 A를 수직 투영한 점
        const projAonB = pA.clone().sub(nB.clone().multiplyScalar(vDiff.dot(nB)));

        return {
          id: `m_p2p_${Date.now()}`,
          type: 'plane_to_plane',
          value: Number(perpDist.toFixed(2)),
          label: `면간 거리 ${perpDist.toFixed(2)} mm`,
          details: {
            dx: Number(dx.toFixed(2)),
            dy: Number(dy.toFixed(2)),
            dz: Number(dz.toFixed(2)),
          },
          startPoint: [pA.x, pA.y, pA.z],
          endPoint: [projAonB.x, projAonB.y, projAonB.z],
          snapA,
          snapB,
        };
      } else {
        // 평행하지 않은 경우 두 평면의 사잇각 계산
        const angleRad = Math.acos(Math.min(1, Math.max(-1, dot)));
        const angleDeg = (angleRad * 180) / Math.PI;

        return {
          id: `m_angle_${Date.now()}`,
          type: 'plane_to_plane',
          value: Number(directDist.toFixed(2)),
          label: `거리 ${directDist.toFixed(2)} mm (각도 ${angleDeg.toFixed(1)}°)`,
          details: {
            dx: Number(dx.toFixed(2)),
            dy: Number(dy.toFixed(2)),
            dz: Number(dz.toFixed(2)),
            angleDeg: Number(angleDeg.toFixed(1)),
          },
          startPoint: [pA.x, pA.y, pA.z],
          endPoint: [pB.x, pB.y, pB.z],
          snapA,
          snapB,
        };
      }
    }

    // 3. [점과 면의 거리 (Point-to-Plane)]
    // 한쪽이 평면이고 다른 쪽이 점/선/원인 경우
    const planeSnap = snapA.type === 'plane' ? snapA : snapB.type === 'plane' ? snapB : null;
    const pointSnap = planeSnap === snapA ? snapB : snapA;

    if (planeSnap && planeSnap.normal) {
      const planeNorm = new THREE.Vector3(...planeSnap.normal).normalize();
      const ptPos = new THREE.Vector3(...pointSnap.point);
      const planePos = new THREE.Vector3(...planeSnap.point);

      const diff = new THREE.Vector3().subVectors(ptPos, planePos);
      const distPerp = Math.abs(diff.dot(planeNorm));

      // 평면에 내린 수선의 발 좌표
      const foot = ptPos.clone().sub(planeNorm.clone().multiplyScalar(diff.dot(planeNorm)));

      return {
        id: `m_pt2pl_${Date.now()}`,
        type: 'point_to_plane',
        value: Number(distPerp.toFixed(2)),
        label: `점-면 거리 ${distPerp.toFixed(2)} mm`,
        details: {
          dx: Number(dx.toFixed(2)),
          dy: Number(dy.toFixed(2)),
          dz: Number(dz.toFixed(2)),
        },
        startPoint: [ptPos.x, ptPos.y, ptPos.z],
        endPoint: [foot.x, foot.y, foot.z],
        snapA,
        snapB,
      };
    }

    // 4. [선과 선의 거리 및 사잇각 (Edge-to-Edge)]
    if (snapA.type === 'edge' && snapB.type === 'edge' && snapA.edgeStart && snapA.edgeEnd && snapB.edgeStart && snapB.edgeEnd) {
      const vA = new THREE.Vector3().subVectors(new THREE.Vector3(...snapA.edgeEnd), new THREE.Vector3(...snapA.edgeStart)).normalize();
      const vB = new THREE.Vector3().subVectors(new THREE.Vector3(...snapB.edgeEnd), new THREE.Vector3(...snapB.edgeStart)).normalize();
      const dot = Math.abs(vA.dot(vB));
      const angleRad = Math.acos(Math.min(1, Math.max(-1, dot)));
      const angleDeg = (angleRad * 180) / Math.PI;

      return {
        id: `m_edge_${Date.now()}`,
        type: 'point_to_point',
        value: Number(directDist.toFixed(2)),
        label: `거리 ${directDist.toFixed(2)} mm (사잇각 ${angleDeg.toFixed(1)}°)`,
        details: {
          dx: Number(dx.toFixed(2)),
          dy: Number(dy.toFixed(2)),
          dz: Number(dz.toFixed(2)),
          angleDeg: Number(angleDeg.toFixed(1)),
        },
        startPoint: [pA.x, pA.y, pA.z],
        endPoint: [pB.x, pB.y, pB.z],
        snapA,
        snapB,
      };
    }

    // 5. [점과 점의 3D 거리 및 XYZ 분해 (Point-to-Point)]
    return {
      id: `m_p2p_direct_${Date.now()}`,
      type: 'point_to_point',
      value: Number(directDist.toFixed(2)),
      label: `${directDist.toFixed(2)} mm`,
      details: {
        dx: Number(dx.toFixed(2)),
        dy: Number(dy.toFixed(2)),
        dz: Number(dz.toFixed(2)),
      },
      startPoint: [pA.x, pA.y, pA.z],
      endPoint: [pB.x, pB.y, pB.z],
      snapA,
      snapB,
    };
  }
}
