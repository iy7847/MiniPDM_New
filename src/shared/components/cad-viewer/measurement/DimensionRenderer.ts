/**
 * 3D 뷰어 치수선, 마커, 점/선/면/원 스마트 하이라이트 Three.js 렌더러
 */
import * as THREE from 'three';
import type { SnapElement, MeasurementItem } from '../types';

export class DimensionRenderer {
  private group = new THREE.Group();
  private hoverGroup = new THREE.Group();
  private selectionGroup = new THREE.Group();
  private measurementLinesGroup = new THREE.Group();

  private modelScale: number = 1000;

  constructor(scene: THREE.Scene) {
    this.group.name = 'DimensionRendererGroup';
    this.group.add(this.hoverGroup);
    this.group.add(this.selectionGroup);
    this.group.add(this.measurementLinesGroup);
    scene.add(this.group);
  }

  public setModelScale(scale: number) {
    this.modelScale = Math.max(scale, 10);
  }

  /**
   * 마우스 호버 스냅 시각화 업데이트 (점/선/면/원 확실한 구분)
   */
  public updateHover(snap: SnapElement | null) {
    this.clearGroup(this.hoverGroup);
    if (!snap) return;

    const baseSize = Math.max(this.modelScale * 0.015, 2.5);

    // 1. [평면(Plane) 하이라이트 - 면 전체를 반투명 청록색으로 환하게 표시]
    if (snap.type === 'plane') {
      if (snap.planeVertices && snap.planeVertices.length >= 9) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(snap.planeVertices, 3));

        // 면 전체 반투명 틴트 (푸른빛 네온)
        const mat = new THREE.MeshBasicMaterial({
          color: 0x0ea5e9,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          depthTest: false,
        });
        const mesh = new THREE.Mesh(geom, mat);
        this.hoverGroup.add(mesh);

        // 평면 외곽 테두리 엣지 라인 강조
        const edgesGeom = new THREE.EdgesGeometry(geom, 20);
        const edgesMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          depthTest: false,
        });
        const edgeLines = new THREE.LineSegments(edgesGeom, edgesMat);
        this.hoverGroup.add(edgeLines);
      } else if (snap.normal) {
        // 단일 점 주변 평면 디스크 패치
        const patchRadius = Math.max(this.modelScale * 0.06, 15);
        const diskGeom = new THREE.CircleGeometry(patchRadius, 32);
        const diskMat = new THREE.MeshBasicMaterial({
          color: 0x0ea5e9,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthTest: false,
        });
        const disk = new THREE.Mesh(diskGeom, diskMat);
        disk.position.set(...snap.point);

        const norm = new THREE.Vector3(...snap.normal).normalize();
        disk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm);
        this.hoverGroup.add(disk);
      }
    }

    // 2. [원형 홀(Circle) 하이라이트 - 슬림한 원 둘레 엣지 라인 및 정밀 십자 마커]
    else if (snap.type === 'circle' && snap.center && snap.radius) {
      // 반경 크기에 상관없이 시야를 가리지 않도록 얇고 세련된 엣지 링 적용
      const ringWidth = Math.max(this.modelScale * 0.002, 1.2);
      const innerR = Math.max(snap.radius - ringWidth * 0.5, 0.1);
      const outerR = snap.radius + ringWidth * 0.5;
      const ringGeom = new THREE.RingGeometry(innerR, outerR, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff, // 선명한 시안
        side: THREE.DoubleSide,
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.set(...snap.center);

      if (snap.normal) {
        const norm = new THREE.Vector3(...snap.normal).normalize();
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm);
      }
      this.hoverGroup.add(ring);

      // 중심 십자선 마커 (화면 전체를 가리지 않도록 적정 크기로 제한)
      const crossSize = Math.min(Math.max(snap.radius * 0.2, baseSize * 0.8), baseSize * 2.0);
      const crossGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-crossSize, 0, 0), new THREE.Vector3(crossSize, 0, 0),
        new THREE.Vector3(0, -crossSize, 0), new THREE.Vector3(0, crossSize, 0),
      ]);
      const cross = new THREE.LineSegments(crossGeom, new THREE.LineBasicMaterial({ color: 0x00ffff, depthTest: false }));
      cross.position.set(...snap.center);
      if (snap.normal) {
        const norm = new THREE.Vector3(...snap.normal).normalize();
        cross.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm);
      }
      this.hoverGroup.add(cross);

      // 원통 중심축 선 표시 (인벤터 표준 1점 쇄선/점선 축 스타일)
      if (snap.cylinderAxis) {
        const axP1 = new THREE.Vector3(...snap.cylinderAxis.start);
        const axP2 = new THREE.Vector3(...snap.cylinderAxis.end);
        const axGeom = new THREE.BufferGeometry().setFromPoints([axP1, axP2]);
        const axMat = new THREE.LineDashedMaterial({
          color: 0x00ffff,
          dashSize: 4,
          gapSize: 2,
          depthTest: false,
        });
        const axLine = new THREE.Line(axGeom, axMat);
        axLine.computeLineDistances();
        this.hoverGroup.add(axLine);
      }
    }

    // 3. [모서리 선(Edge) 하이라이트 - 인벤터 스타일의 선명하고 깔끔한 라인 하이라이트]
    else if (snap.type === 'edge' && snap.edgeStart && snap.edgeEnd) {
      const p1 = new THREE.Vector3(...snap.edgeStart);
      const p2 = new THREE.Vector3(...snap.edgeEnd);

      const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffd600, linewidth: 3, depthTest: false });
      const line = new THREE.Line(lineGeom, lineMat);
      this.hoverGroup.add(line);
      // 거대한 구체 마커는 제거하여 상용 CAD처럼 모서리 선 자체만 깨끗하게 표시
    }

    // 4. [꼭짓점(Vertex) 하이라이트 - 선명한 붉은색 소형 마커 및 외곽 링]
    else if (snap.type === 'vertex') {
      const dotSize = Math.min(Math.max(baseSize * 0.5, 1.5), 3.0);
      const dotGeom = new THREE.SphereGeometry(dotSize, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xff3344, depthTest: false });
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.set(...snap.point);
      this.hoverGroup.add(dot);

      // 펄스 링 (크기 제한)
      const ringGeom = new THREE.RingGeometry(dotSize * 1.5, dotSize * 2.0, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3344, side: THREE.DoubleSide, depthTest: false });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.set(...snap.point);
      this.hoverGroup.add(ring);
    }
  }

  /**
   * 첫 번째 선택 요소(A) 고정 하이라이트 (녹색 테마)
   */
  public updateSelection(selectedA: SnapElement | null) {
    this.clearGroup(this.selectionGroup);
    if (!selectedA) return;

    const baseSize = Math.max(this.modelScale * 0.015, 2.5);

    // 1번 선택 요소가 평면인 경우 평면 전체를 초록색 반투명으로 유지
    if (selectedA.type === 'plane' && selectedA.planeVertices && selectedA.planeVertices.length >= 9) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(selectedA.planeVertices, 3));

      const mat = new THREE.MeshBasicMaterial({
        color: 0x3fb950, // 에메랄드 그린
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      this.selectionGroup.add(mesh);

      const edgesGeom = new THREE.EdgesGeometry(geom, 20);
      const edgesMat = new THREE.LineBasicMaterial({ color: 0x3fb950, depthTest: false });
      this.selectionGroup.add(new THREE.LineSegments(edgesGeom, edgesMat));
    } else if (selectedA.type === 'circle' && selectedA.center && selectedA.radius) {
      // 1번 선택 요소가 원/원통인 경우: 에메랄드 원형 링 및 원통 중심축 시각화
      const ringWidth = Math.max(this.modelScale * 0.003, 1.5);
      const innerR = Math.max(selectedA.radius - ringWidth * 0.5, 0.1);
      const outerR = selectedA.radius + ringWidth * 0.5;
      const ringGeom = new THREE.RingGeometry(innerR, outerR, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x3fb950, // 에메랄드 그린
        side: THREE.DoubleSide,
        depthTest: false,
        transparent: true,
        opacity: 0.95,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.set(...selectedA.center);
      if (selectedA.normal) {
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...selectedA.normal).normalize());
      }
      this.selectionGroup.add(ring);

      // 원통 중심축 점선 표시
      if (selectedA.cylinderAxis) {
        const axP1 = new THREE.Vector3(...selectedA.cylinderAxis.start);
        const axP2 = new THREE.Vector3(...selectedA.cylinderAxis.end);
        const axGeom = new THREE.BufferGeometry().setFromPoints([axP1, axP2]);
        const axMat = new THREE.LineDashedMaterial({
          color: 0x3fb950,
          dashSize: 4,
          gapSize: 2,
          depthTest: false,
        });
        const axLine = new THREE.Line(axGeom, axMat);
        axLine.computeLineDistances();
        this.selectionGroup.add(axLine);
      }

      // 클릭 지점 마커
      const dotGeom = new THREE.SphereGeometry(baseSize * 0.8, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x3fb950, depthTest: false });
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.set(...selectedA.point);
      this.selectionGroup.add(dot);
    } else {
      // 점/선 선택 위치 표시
      const dotGeom = new THREE.SphereGeometry(baseSize * 1.2, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x3fb950, depthTest: false });
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.set(...selectedA.point);
      this.selectionGroup.add(dot);
    }
  }

  /**
   * 확정된 치수선 렌더링 (인벤터 스타일 3D 뷰포트 시각화: 주 치수선 + 🔴X 🟢Y 🔵Z 3축 델타 분해선)
   */
  public renderMeasurements(measurements: MeasurementItem[]) {
    this.clearGroup(this.measurementLinesGroup);
    const baseSize = Math.max(this.modelScale * 0.015, 2.5);

    for (const m of measurements) {
      if (m.type === 'hole') {
        const p = new THREE.Vector3(...m.startPoint);
        const markerSize = Math.min(Math.max((m.snapA.radius || baseSize) * 0.25, baseSize * 0.8), baseSize * 2.0);

        // 홀 중심 십자 마커
        const crossGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p.x - markerSize, p.y, p.z), new THREE.Vector3(p.x + markerSize, p.y, p.z),
          new THREE.Vector3(p.x, p.y - markerSize, p.z), new THREE.Vector3(p.x, p.y + markerSize, p.z),
        ]);
        const cross = new THREE.LineSegments(crossGeom, new THREE.LineBasicMaterial({ color: 0x00f2fe, depthTest: false }));
        this.measurementLinesGroup.add(cross);

        // 홀 둘레 원형 강조 링 (슬림 엣지)
        if (m.snapA.radius) {
          const ringWidth = Math.max(this.modelScale * 0.002, 1.2);
          const innerR = Math.max(m.snapA.radius - ringWidth * 0.5, 0.1);
          const outerR = m.snapA.radius + ringWidth * 0.5;
          const ringGeom = new THREE.RingGeometry(innerR, outerR, 64);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.85 });
          const ring = new THREE.Mesh(ringGeom, ringMat);
          ring.position.copy(p);
          if (m.snapA.normal) {
            ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...m.snapA.normal).normalize());
          }
          this.measurementLinesGroup.add(ring);
        }
      } else {
        const p1 = new THREE.Vector3(...m.startPoint);
        const p2 = new THREE.Vector3(...m.endPoint);

        // 1. [인벤터 주 치수선 (Primary Dimension Line)]
        const mainLineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const mainLineMat = new THREE.LineBasicMaterial({
          color: 0x00f2fe, // 밝은 시안
          linewidth: 2,
          depthTest: false,
        });
        const mainLine = new THREE.Line(mainLineGeom, mainLineMat);
        this.measurementLinesGroup.add(mainLine);

        // 시작점/끝점 구형 마커 (크기 최적화)
        const dotSize = Math.min(Math.max(baseSize * 0.4, 1.5), 3.5);
        const dotGeom = new THREE.SphereGeometry(dotSize, 16, 16);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, depthTest: false });

        const d1 = new THREE.Mesh(dotGeom, dotMat);
        d1.position.copy(p1);
        const d2 = new THREE.Mesh(dotGeom, dotMat);
        d2.position.copy(p2);
        this.measurementLinesGroup.add(d1);
        this.measurementLinesGroup.add(d2);

        // ⭐ 2. [인벤터 스타일 3축 델타 분해선 (XYZ Triad Lines)]
        // 두 점이 3D 대각선으로 떨어져 있는 경우 X(빨강), Y(초록), Z(파랑) 직교 분해선 렌더링
        const dx = Math.abs(p2.x - p1.x);
        const dy = Math.abs(p2.y - p1.y);
        const dz = Math.abs(p2.z - p1.z);

        const significantAxes = [dx > 1.0, dy > 1.0, dz > 1.0].filter(Boolean).length;

        if (significantAxes >= 2) {
          const c1 = new THREE.Vector3(p2.x, p1.y, p1.z); // X축 끝
          const c2 = new THREE.Vector3(p2.x, p2.y, p1.z); // Y축 끝 (Z축 시작)

          // 🔴 X축 투영선 (빨강)
          if (dx > 1.0) {
            const xGeom = new THREE.BufferGeometry().setFromPoints([p1, c1]);
            const xMat = new THREE.LineDashedMaterial({
              color: 0xef4444,
              dashSize: baseSize * 0.7,
              gapSize: baseSize * 0.35,
              depthTest: false,
            });
            const xLine = new THREE.Line(xGeom, xMat);
            xLine.computeLineDistances();
            this.measurementLinesGroup.add(xLine);
          }

          // 🟢 Y축 투영선 (초록)
          if (dy > 1.0) {
            const yGeom = new THREE.BufferGeometry().setFromPoints([c1, c2]);
            const yMat = new THREE.LineDashedMaterial({
              color: 0x22c55e,
              dashSize: baseSize * 0.7,
              gapSize: baseSize * 0.35,
              depthTest: false,
            });
            const yLine = new THREE.Line(yGeom, yMat);
            yLine.computeLineDistances();
            this.measurementLinesGroup.add(yLine);
          }

          // 🔵 Z축 투영선 (파랑)
          if (dz > 1.0) {
            const zGeom = new THREE.BufferGeometry().setFromPoints([c2, p2]);
            const zMat = new THREE.LineDashedMaterial({
              color: 0x3b82f6,
              dashSize: baseSize * 0.7,
              gapSize: baseSize * 0.35,
              depthTest: false,
            });
            const zLine = new THREE.Line(zGeom, zMat);
            zLine.computeLineDistances();
            this.measurementLinesGroup.add(zLine);
          }

          // 중간 꺾임 코너 마커
          const cornerDotGeom = new THREE.SphereGeometry(baseSize * 0.35, 10, 10);
          const cornerMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, depthTest: false });
          if (dx > 1.0 && dy > 1.0) {
            const m1 = new THREE.Mesh(cornerDotGeom, cornerMat);
            m1.position.copy(c1);
            this.measurementLinesGroup.add(m1);
          }
          if ((dx > 1.0 || dy > 1.0) && dz > 1.0) {
            const m2 = new THREE.Mesh(cornerDotGeom, cornerMat);
            m2.position.copy(c2);
            this.measurementLinesGroup.add(m2);
          }
        }
      }
    }
  }

  private clearGroup(g: THREE.Group) {
    while (g.children.length > 0) {
      const obj = g.children[0];
      g.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    }
  }

  public clearAll() {
    this.clearGroup(this.hoverGroup);
    this.clearGroup(this.selectionGroup);
    this.clearGroup(this.measurementLinesGroup);
  }

  public dispose(scene: THREE.Scene) {
    this.clearAll();
    scene.remove(this.group);
  }
}
