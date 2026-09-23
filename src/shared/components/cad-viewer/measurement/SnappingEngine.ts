/**
 * CAD 모델 3D 마우스 스냅 엔진 (Raycasting 기반 점/선/원/면 자동 감지)
 */
import * as THREE from 'three';
import type { SnapElement, SnapElementType } from '../types';
import type { DetectedCircle } from '../workers/stepParserCore';

interface CylinderFeature {
  radius: number;
  diameter: number;
  axis: THREE.Vector3; // 정규화된 중심축 벡터
  c1: THREE.Vector3; // 시작점 (원 1 중심)
  c2: THREE.Vector3; // 끝점 (원 2 중심)
  minT: number;
  maxT: number;
  length: number;
}

export class SnappingEngine {
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();
  private edgesCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
  private cylindersCache = new WeakMap<DetectedCircle[], CylinderFeature[]>();

  constructor() {
    // 선분 및 점 감지용 레이캐스터 임계값(Threshold) 설정
    this.raycaster.params.Line = { threshold: 0.5 };
    this.raycaster.params.Points = { threshold: 0.8 };
  }

  /**
   * detectedCircles 목록으로부터 동일 축/반경을 갖는 원통(Cylinder) 피처들을 추출/캐싱
   */
  private getCylinders(detectedCircles: DetectedCircle[]): CylinderFeature[] {
    if (this.cylindersCache.has(detectedCircles)) {
      return this.cylindersCache.get(detectedCircles)!;
    }

    const cylinders: CylinderFeature[] = [];

    // 1. 동일 반경 및 축을 공유하는 원 쌍 매칭 (원통의 양 끝단 원호 페어링)
    for (let i = 0; i < detectedCircles.length; i++) {
      const c1 = detectedCircles[i];
      const p1 = new THREE.Vector3(...c1.center);
      const n1 = new THREE.Vector3(...c1.normal).normalize();

      for (let j = i + 1; j < detectedCircles.length; j++) {
        const c2 = detectedCircles[j];
        if (Math.abs(c1.radius - c2.radius) > 1.0) continue; // 반경 오차 허용치 1.0mm

        const p2 = new THREE.Vector3(...c2.center);
        const n2 = new THREE.Vector3(...c2.normal).normalize();

        // 법선이 평행하거나 반대 방향인지 검사
        const dotN = Math.abs(n1.dot(n2));
        if (dotN < 0.95) continue;

        // 중심 간 벡터
        const toP2 = new THREE.Vector3().subVectors(p2, p1);
        const dist = toP2.length();
        if (dist < 0.5) continue; // 동일 원 배제

        // 중심 간 벡터가 축 법선과 평행한지 검사
        const dotAxis = Math.abs(toP2.dot(n1) / dist);
        if (dotAxis > 0.90) {
          const axisDir = toP2.clone().normalize();
          // 모따기/단차 여유분 6mm 제공
          cylinders.push({
            radius: Math.max(c1.radius, c2.radius),
            diameter: Math.max(c1.diameter, c2.diameter),
            axis: axisDir,
            c1: p1.clone().sub(axisDir.clone().multiplyScalar(4.0)),
            c2: p2.clone().add(axisDir.clone().multiplyScalar(4.0)),
            minT: -4.0,
            maxT: dist + 4.0,
            length: dist + 8.0,
          });
        }
      }
    }

    // 2. 동축(Coaxial) 단차 샤프트 및 상이 반경 원통 구간 매칭
    // (예: Ø20 끝단 원과 Ø22 샤프트 몸통 원 사이의 원통 구간 연결)
    for (let i = 0; i < detectedCircles.length; i++) {
      const c1 = detectedCircles[i];
      const p1 = new THREE.Vector3(...c1.center);
      const n1 = new THREE.Vector3(...c1.normal).normalize();

      for (let j = 0; j < detectedCircles.length; j++) {
        if (i === j) continue;
        const c2 = detectedCircles[j];
        const p2 = new THREE.Vector3(...c2.center);
        const toP2 = new THREE.Vector3().subVectors(p2, p1);
        const dist = toP2.length();
        if (dist < 1.0) continue;

        const dotAxis = Math.abs(toP2.dot(n1) / dist);
        if (dotAxis > 0.92) {
          const axisDir = toP2.clone().normalize();
          cylinders.push({
            radius: c1.radius,
            diameter: c1.diameter,
            axis: axisDir,
            c1: p1.clone(),
            c2: p2.clone(),
            minT: -4.0,
            maxT: dist + 4.0,
            length: dist + 8.0,
          });
        }
      }
    }

    // 3. 단독 원(상대 원이 없는 막힌 홀/단차부)의 경우에도 긴 샤프트 지원을 위해 넉넉한 깊이(최소 200mm 또는 반경의 10배) 지원
    for (const c of detectedCircles) {
      const p = new THREE.Vector3(...c.center);
      const n = new THREE.Vector3(...c.normal).normalize();
      const depth = Math.max(c.radius * 8, 200);
      cylinders.push({
        radius: c.radius,
        diameter: c.diameter,
        axis: n.clone(),
        c1: p.clone().sub(n.clone().multiplyScalar(depth * 0.5)),
        c2: p.clone().add(n.clone().multiplyScalar(depth * 0.5)),
        minT: -depth * 0.5,
        maxT: depth * 0.5,
        length: depth,
      });
    }

    this.cylindersCache.set(detectedCircles, cylinders);
    return cylinders;
  }

  /**
   * 화면 마우스 좌표에서 가장 적합한 기하학적 요소(원/점/선/면)를 스냅하여 반환
   */
  public snap(
    clientX: number,
    clientY: number,
    canvasRect: DOMRect,
    camera: THREE.Camera,
    meshObjects: THREE.Mesh[],
    detectedCircles: DetectedCircle[]
  ): SnapElement | null {
    if (meshObjects.length === 0) return null;

    // 1. 마우스 정규화 좌표 (-1 ~ +1) 계산
    this.mouseVec.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    this.mouseVec.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVec, camera);

    // 2. 메쉬와의 교차점 검사
    const intersects = this.raycaster.intersectObjects(meshObjects, false);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const hitPoint = hit.point;
    const face = hit.face;

    // 카메라 거리 및 FOV 기반 픽셀당 월드 크기 계산 (줌 레벨에 최적화된 스냅 감도)
    let worldPxSize = 0.5;
    if (camera instanceof THREE.PerspectiveCamera) {
      const camDist = camera.position.distanceTo(hitPoint);
      worldPxSize = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camDist) / canvasRect.height;
    }
    const maxDistToPlane = Math.max(worldPxSize * 12, 4.0);
    const maxDistToRim = Math.max(worldPxSize * 16, 5.0);

    // 3. [1순위: 원형 홀(Circle) 둘레 스냅 검사]
    // 마우스 레이캐스트가 맞춘 실제 3D 표면이 원의 둘레 모서리선에 정밀하게 닿았을 때만 스냅! (뒤편 가려진 원 낚임 원천 차단)
    for (const circle of detectedCircles) {
      const circleCenter = new THREE.Vector3(...circle.center);
      const circleNormal = new THREE.Vector3(...circle.normal).normalize();

      // ⭐ 1단계 검사: 마우스가 짚은 3D 표면 점이 원이 놓인 평면과 일치하는가?
      const toHit = new THREE.Vector3().subVectors(hitPoint, circleCenter);
      const distToCirclePlane = Math.abs(circleNormal.dot(toHit));
      // 원 평면에서 허용 오차 이상 떨어져 있는 앞쪽/뒤쪽 다른 부품이면 즉시 탈락!
      if (distToCirclePlane > maxDistToPlane) continue;

      // ⭐ 2단계 검사: 원 평면 상에서 중심으로부터의 거리가 실제 반지름과 일치하는가? (모서리 밀착도)
      const projectedHit = toHit.clone().sub(circleNormal.clone().multiplyScalar(circleNormal.dot(toHit)));
      const distInPlane = projectedHit.length();
      const distToRim3D = Math.abs(distInPlane - circle.radius);
      // 실제 원형 모서리선에서 허용 오차 이상 떨어진 평면 내부/외부면 탈락!
      if (distToRim3D > maxDistToRim) continue;

      // ⭐ 3단계 검사: 2D 화면 좌표계 상에서 마우스 커서와 원 둘레 간의 픽셀 거리 (16px 이내)
      const centerScreen = circleCenter.clone().project(camera);
      if (centerScreen.z > 1) continue; // 카메라 뒷면 제외

      const centerPxX = ((centerScreen.x + 1) * canvasRect.width) / 2 + canvasRect.left;
      const centerPxY = ((-centerScreen.y + 1) * canvasRect.height) / 2 + canvasRect.top;
      const mouseDistToCenterPx = Math.hypot(clientX - centerPxX, clientY - centerPxY);

      // 평면 투영 방향 기준으로 원 둘레 3D 좌표 산출
      const dir = distInPlane > 1e-4 ? projectedHit.clone().normalize() : new THREE.Vector3(1, 0, 0);
      const rimPoint3D = circleCenter.clone().add(dir.multiplyScalar(circle.radius));
      const rimScreen = rimPoint3D.project(camera);
      const rimPxX = ((rimScreen.x + 1) * canvasRect.width) / 2 + canvasRect.left;
      const rimPxY = ((-rimScreen.y + 1) * canvasRect.height) / 2 + canvasRect.top;
      const radiusPx = Math.hypot(rimPxX - centerPxX, rimPxY - centerPxY);

      const mouseDistToRimPx = Math.abs(mouseDistToCenterPx - radiusPx);

      if (mouseDistToRimPx < 16) {
        return {
          type: 'circle',
          point: [circleCenter.x, circleCenter.y, circleCenter.z],
          center: [circleCenter.x, circleCenter.y, circleCenter.z],
          radius: circle.radius,
          diameter: circle.diameter,
          normal: [circleNormal.x, circleNormal.y, circleNormal.z],
          description: `원형 홀 (Ø ${circle.diameter.toFixed(2)} mm, R ${circle.radius.toFixed(2)} mm)`,
        };
      }
    }

    // 4. [2순위: 원통 곡면(Cylindrical Surface) 스냅 검사]
    // 마우스가 원통의 둥근 기둥 옆면에 닿았을 때 자동으로 직경/반경 및 중심축 스냅!
    if (face && hit.object instanceof THREE.Mesh) {
      const worldFaceNormal = face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();

      let bestCyl: CylinderFeature | null = null;
      let minRadialError = Infinity;
      let bestAxisPoint: THREE.Vector3 | null = null;

      for (const cyl of this.getCylinders(detectedCircles)) {
        // A. 법선 직교성 검사: 메쉬 면의 법선이 원통의 중심축과 직교해야 함 (|faceNormal · axis| < 0.35)
        const dotAxis = Math.abs(worldFaceNormal.dot(cyl.axis));
        if (dotAxis > 0.35) continue;

        // B. 축 상의 투영점 및 축 방향 높이 t 계산
        const toHit = new THREE.Vector3().subVectors(hitPoint, cyl.c1);
        const t = toHit.dot(cyl.axis);

        // C. 원통의 길이 범위 내에 있는지 검사 (여유 오차 6.0mm)
        if (t < cyl.minT - 6.0 || t > cyl.maxT + 6.0) continue;

        // D. 축으로부터의 수직 거리 계산
        const perpVec = toHit.clone().sub(cyl.axis.clone().multiplyScalar(t));
        const distFromAxis = perpVec.length();

        // E. 반경과의 일치도 검사
        const radialError = Math.abs(distFromAxis - cyl.radius);
        const maxRadialTol = Math.max(worldPxSize * 16, 6.0);
        if (radialError > maxRadialTol) continue;

        // F. 법선 방향 검사: 면 법선이 축에서 방사형 방향(외경) 또는 안쪽(내경)과 정렬되어 있는가?
        if (distFromAxis > 1e-4) {
          const radialDir = perpVec.clone().normalize();
          const radialDot = Math.abs(worldFaceNormal.dot(radialDir));
          if (radialDot < 0.45) continue; // 방사형 법선이 아니면 배제
        }

        if (radialError < minRadialError) {
          minRadialError = radialError;
          bestCyl = cyl;
          bestAxisPoint = cyl.c1.clone().add(cyl.axis.clone().multiplyScalar(t));
        }
      }

      if (bestCyl && bestAxisPoint) {
        return {
          type: 'circle',
          point: [hitPoint.x, hitPoint.y, hitPoint.z],
          center: [bestAxisPoint.x, bestAxisPoint.y, bestAxisPoint.z],
          radius: bestCyl.radius,
          diameter: bestCyl.diameter,
          normal: [bestCyl.axis.x, bestCyl.axis.y, bestCyl.axis.z],
          isCylinderFace: true,
          cylinderAxis: {
            start: [bestCyl.c1.x, bestCyl.c1.y, bestCyl.c1.z],
            end: [bestCyl.c2.x, bestCyl.c2.y, bestCyl.c2.z],
          },
          description: `원통 곡면 (Ø ${bestCyl.diameter.toFixed(2)} mm, R ${bestCyl.radius.toFixed(2)} mm)`,
        };
      }
    }

    // 5. [3순위 & 4순위: 진짜 CAD 피처 엣지(Sharp Edge) 및 꼭짓점(Vertex) 스냅 검사]
    // 평면 내부를 대각선으로 가르는 가상의 삼각망 분할선과 내부 정점은 완벽히 제외하고,
    // 실제 20도 이상 꺾인 외곽 모서리와 그 모서리의 양 끝점(코너 정점)만 정밀 스냅!
    if (hit.object instanceof THREE.Mesh) {
      let edgesGeom = (hit.object.userData.edgesGeometry as THREE.EdgesGeometry) || null;
      if (!edgesGeom && hit.object.geometry) {
        if (!this.edgesCache.has(hit.object.geometry)) {
          this.edgesCache.set(hit.object.geometry, new THREE.EdgesGeometry(hit.object.geometry, 20));
        }
        edgesGeom = this.edgesCache.get(hit.object.geometry)!;
      }

      if (edgesGeom) {
        const pos = edgesGeom.getAttribute('position');
        const matrixWorld = hit.object.matrixWorld;
        let closestEdge: { start: THREE.Vector3; end: THREE.Vector3 } | null = null;
        let minEdgePxDist = Infinity;
        let closestVertexPoint: THREE.Vector3 | null = null;
        let minVertexPxDist = Infinity;

        const pA = new THREE.Vector3();
        const pB = new THREE.Vector3();
        const segmentCount = pos.count / 2;

        // 카메라 거리 및 FOV 기반 화면 14px에 해당하는 3D 공간 허용 오차 계산 (줌 레벨에 독립적인 완벽한 스냅)
        let max3dDist = 8.0;
        if (camera instanceof THREE.PerspectiveCamera) {
          const camDist = camera.position.distanceTo(hitPoint);
          const worldPxSize = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camDist) / canvasRect.height;
          max3dDist = Math.max(worldPxSize * 14, 5.0);
        }

        for (let i = 0; i < segmentCount; i++) {
          pA.fromBufferAttribute(pos, i * 2).applyMatrix4(matrixWorld);
          pB.fromBufferAttribute(pos, i * 2 + 1).applyMatrix4(matrixWorld);

          // 1단계: 3D 공간 상에서 마우스 표면 타격점(hitPoint)과 모서리 선분(pA-pB) 사이의 최단 거리 계산
          // (평면 한가운데를 가리킬 때는 모서리와 수십~수백mm 떨어져 있으므로 즉시 탈락하여 평면으로 스냅되도록 처리)
          const ab = new THREE.Vector3().subVectors(pB, pA);
          const ap = new THREE.Vector3().subVectors(hitPoint, pA);
          const l2_3d = ab.lengthSq();
          if (l2_3d === 0) continue;
          let t3d = ap.dot(ab) / l2_3d;
          t3d = Math.max(0, Math.min(1, t3d));
          const proj3d = pA.clone().add(ab.multiplyScalar(t3d));
          const dist3d = hitPoint.distanceTo(proj3d);

          // 실제 모서리 선분과의 3D 거리가 동적 허용치 이내로 밀착했을 때만 2단계 화면 검사 진행
          if (dist3d > max3dDist) {
            continue;
          }

          // 2단계: 2D 화면 투영 좌표 계산
          const s1 = pA.clone().project(camera);
          const s2 = pB.clone().project(camera);
          const px1 = ((s1.x + 1) * canvasRect.width) / 2 + canvasRect.left;
          const py1 = ((-s1.y + 1) * canvasRect.height) / 2 + canvasRect.top;
          const px2 = ((s2.x + 1) * canvasRect.width) / 2 + canvasRect.left;
          const py2 = ((-s2.y + 1) * canvasRect.height) / 2 + canvasRect.top;

          // 모서리 양 끝점(Vertex)과의 화면 거리 검사 (10px 이내 초정밀 스냅)
          const distToA = Math.hypot(clientX - px1, clientY - py1);
          const distToB = Math.hypot(clientX - px2, clientY - py2);
          if (distToA < 10 && distToA < minVertexPxDist) {
            minVertexPxDist = distToA;
            closestVertexPoint = pA.clone();
          }
          if (distToB < 10 && distToB < minVertexPxDist) {
            minVertexPxDist = distToB;
            closestVertexPoint = pB.clone();
          }

          // 모서리 선분과의 화면 거리 계산
          const l2 = (px2 - px1) ** 2 + (py2 - py1) ** 2;
          let t = l2 === 0 ? 0 : ((clientX - px1) * (px2 - px1) + (clientY - py1) * (py2 - py1)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = px1 + t * (px2 - px1);
          const projY = py1 + t * (py2 - py1);
          const pxDist = Math.hypot(clientX - projX, clientY - projY);

          // 화면 14픽셀 이내 스냅
          if (pxDist < 14 && pxDist < minEdgePxDist) {
            minEdgePxDist = pxDist;
            closestEdge = { start: pA.clone(), end: pB.clone() };
          }
        }

        // 끝점(Vertex)에 10px 이내로 근접했으면 꼭짓점으로 스냅
        if (closestVertexPoint) {
          return {
            type: 'vertex',
            point: [closestVertexPoint.x, closestVertexPoint.y, closestVertexPoint.z],
            description: `꼭짓점 (${closestVertexPoint.x.toFixed(2)}, ${closestVertexPoint.y.toFixed(2)}, ${closestVertexPoint.z.toFixed(2)})`,
          };
        }

        // 모서리 선(Edge)에 14px 이내로 근접했으면 모서리로 스냅
        if (closestEdge) {
          const midPoint = new THREE.Vector3()
            .addVectors(closestEdge.start, closestEdge.end)
            .multiplyScalar(0.5);
          const length = closestEdge.start.distanceTo(closestEdge.end);

          return {
            type: 'edge',
            point: [midPoint.x, midPoint.y, midPoint.z],
            edgeStart: [closestEdge.start.x, closestEdge.start.y, closestEdge.start.z],
            edgeEnd: [closestEdge.end.x, closestEdge.end.y, closestEdge.end.z],
            length: Number(length.toFixed(2)),
            description: `모서리 선 (길이: ${length.toFixed(2)} mm)`,
          };
        }
      }
    }

    // 6. [4순위: 평면(Planar Face) 스냅]
    if (face && hit.object instanceof THREE.Mesh) {
      const worldNormal = face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();

      // 동일 평면(Coplanar)에 속하는 모든 삼각형들을 모아 면 전체 하이라이트 지오메트리 생성
      let planeVertices: Float32Array | undefined;
      const geom = hit.object.geometry as THREE.BufferGeometry;
      const posAttr = geom.getAttribute('position');
      const normAttr = geom.getAttribute('normal');
      const idxAttr = geom.getIndex();

      if (posAttr) {
        const localNormal = face.normal;
        // 평면 방정식: localNormal · point + D = 0
        const v0 = new THREE.Vector3().fromBufferAttribute(posAttr, face.a);
        const planeD = -localNormal.dot(v0);

        const coplanarPoints: number[] = [];
        const matrixWorld = hit.object.matrixWorld;

        const triCount = idxAttr ? idxAttr.count / 3 : posAttr.count / 3;
        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        const vC = new THREE.Vector3();
        const triNorm = new THREE.Vector3();

        for (let i = 0; i < triCount; i++) {
          const i1 = idxAttr ? idxAttr.getX(i * 3) : i * 3;
          const i2 = idxAttr ? idxAttr.getX(i * 3 + 1) : i * 3 + 1;
          const i3 = idxAttr ? idxAttr.getX(i * 3 + 2) : i * 3 + 2;

          vA.fromBufferAttribute(posAttr, i1);
          vB.fromBufferAttribute(posAttr, i2);
          vC.fromBufferAttribute(posAttr, i3);

          // 삼각형 평면 법선 계산
          triNorm.subVectors(vB, vA).cross(vC.clone().sub(vA)).normalize();

          if (triNorm.dot(localNormal) > 0.98) {
            // 법선이 평행하고 평면과의 거리차가 1.0mm 이내인 경우
            const distToPlane = Math.abs(localNormal.dot(vA) + planeD);
            if (distToPlane < 1.0) {
              // 월드 좌표로 변환하여 저장
              vA.applyMatrix4(matrixWorld);
              vB.applyMatrix4(matrixWorld);
              vC.applyMatrix4(matrixWorld);

              coplanarPoints.push(vA.x, vA.y, vA.z, vB.x, vB.y, vB.z, vC.x, vC.y, vC.z);
            }
          }
        }

        if (coplanarPoints.length > 0) {
          planeVertices = new Float32Array(coplanarPoints);
        }
      }

      return {
        type: 'plane',
        point: [hitPoint.x, hitPoint.y, hitPoint.z],
        normal: [worldNormal.x, worldNormal.y, worldNormal.z],
        planeVertices,
        description: `평면 (법선: [${worldNormal.x.toFixed(2)}, ${worldNormal.y.toFixed(2)}, ${worldNormal.z.toFixed(2)}])`,
      };
    }

    return null;
  }
}
