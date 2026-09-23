/**
 * Three.js 3D CAD 메인 렌더링 캔버스 및 인터랙션 컴포넌트
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

import type { RenderMode, ViewPreset, OrbitMode, MeasurementItem, SnapElement, CadUnit, BoundingBoxMode, OBBData } from './types';
import type { ParsedMesh, DetectedCircle } from './workers/stepParserCore';
import { SnappingEngine } from './measurement/SnappingEngine';
import { DimensionCalculator } from './measurement/DimensionCalculator';
import { DimensionRenderer } from './measurement/DimensionRenderer';
import { DimensionOverlay } from './measurement/DimensionOverlay';

interface CadCanvasProps {
  meshes: ParsedMesh[];
  detectedCircles: DetectedCircle[];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
  };
  obb?: OBBData | null;
  boundingBoxMode?: BoundingBoxMode;
  renderMode: RenderMode;
  viewPreset: ViewPreset | null;
  orbitMode?: OrbitMode;
  resetTrigger: number;
  isMeasureMode: boolean;
  isClippingActive: boolean;
  clipAxis: 'x' | 'y' | 'z';
  clipOffset: number;
  unit?: CadUnit;
  onUnitChange?: (unit: CadUnit) => void;
  onMeasurementsChange?: (items: MeasurementItem[]) => void;
  showGrid?: boolean;
  onSelectedAChange?: (element: SnapElement | null) => void;
}

export const CadCanvas: React.FC<CadCanvasProps> = ({
  meshes,
  detectedCircles,
  boundingBox,
  obb,
  boundingBoxMode = 'none',
  renderMode,
  viewPreset,
  orbitMode = 'free',
  resetTrigger,
  isMeasureMode,
  isClippingActive,
  clipAxis,
  clipOffset,
  unit = 'mm',
  onUnitChange,
  onMeasurementsChange,
  showGrid = false,
  onSelectedAChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<TrackballControls | OrbitControls | null>(null);

  // 3D 객체 참조
  const modelGroupRef = useRef<THREE.Group>(new THREE.Group());
  const edgeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const clippingPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const clippingGroupRef = useRef<THREE.Group>(new THREE.Group());
  const boundingBoxGroupRef = useRef<THREE.Group>(new THREE.Group());

  // 측정 엔진 인스턴스
  const snappingEngineRef = useRef<SnappingEngine>(new SnappingEngine());
  const dimensionRendererRef = useRef<DimensionRenderer | null>(null);
  const worldCirclesRef = useRef<DetectedCircle[]>([]);
  const pointerDownPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const isDraggingRef = useRef<boolean>(false);

  // 측정 상태
  const [measurements, setMeasurements] = useState<MeasurementItem[]>([]);
  const [hoverSnap, setHoverSnap] = useState<SnapElement | null>(null);
  const [selectedA, setSelectedA] = useState<SnapElement | null>(null);
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  const [, setOverlayTick] = useState<number>(0);

  // 부모 컴포넌트에 selectedA 동기화
  useEffect(() => {
    onSelectedAChange?.(selectedA);
  }, [selectedA, onSelectedAChange]);

  // 카메라 조작 시 2D 오버레이 좌표만 rAF 쓰로틀링으로 부드럽게 갱신 (60fps React 전체 리렌더링 폭주 방지)
  const updatePendingRef = useRef(false);
  const handleControlsChange = useCallback(() => {
    if (!updatePendingRef.current) {
      updatePendingRef.current = true;
      requestAnimationFrame(() => {
        updatePendingRef.current = false;
        setOverlayTick((t) => (t + 1) % 1000);
      });
    }
  }, []);

  // 궤도 컨트롤러(자유 궤도 Trackball vs 턴테이블 Orbit) 인스턴스 생성 헬퍼
  const createControls = useCallback((
    mode: OrbitMode,
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    target?: THREE.Vector3
  ) => {
    if (controlsRef.current) {
      controlsRef.current.removeEventListener('change', handleControlsChange);
      controlsRef.current.dispose();
      controlsRef.current = null;
    }

    const targetPos = target || new THREE.Vector3(0, 0, 0);

    if (mode === 'free') {
      // 🌟 [자유 궤도] 상하 180도 제한 없이 360도 전방향 자유 회전 (Trackball)
      const tb = new TrackballControls(camera, domElement);
      tb.rotateSpeed = 3.0; // 빠르고 직관적인 마우스 회전 반응
      tb.zoomSpeed = 1.2;
      tb.panSpeed = 0.8;
      tb.staticMoving = false;
      tb.dynamicDampingFactor = 0.18; // 부드러운 감속 관성
      tb.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      };
      tb.target.copy(targetPos);
      tb.handleResize();
      tb.addEventListener('change', handleControlsChange);
      controlsRef.current = tb;
      return tb;
    } else {
      // 🔄 [턴테이블] 수직 축(Y) 고정 안정적 회전 (Orbit)
      const ob = new OrbitControls(camera, domElement);
      ob.enableDamping = true;
      ob.dampingFactor = 0.08;
      ob.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      };
      ob.target.copy(targetPos);
      ob.addEventListener('change', handleControlsChange);
      controlsRef.current = ob;
      return ob;
    }
  }, [handleControlsChange]);

  // 1. Three.js 기본 씬, 카메라, 렌더러 초기화
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117); // MiniPDM 기본 다크 배경
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(150, 150, 150);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, stencil: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true; // 단면 절단 활성화
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 자유 궤도(기본) 또는 지정된 궤도 컨트롤러 초기화
    createControls(orbitMode, camera, renderer.domElement);

    // 조명 구성 (부드러운 스튜디오 조명)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(200, 300, 200);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-200, -100, -200);
    scene.add(dirLight2);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222233, 0.35);
    scene.add(hemiLight);

    // 모델 및 모서리 그룹 등록
    scene.add(modelGroupRef.current);
    scene.add(edgeGroupRef.current);
    scene.add(clippingGroupRef.current);
    scene.add(boundingBoxGroupRef.current);

    // 치수선 렌더러 초기화
    dimensionRendererRef.current = new DimensionRenderer(scene);

    // 윈도우 리사이즈 핸들러
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (controlsRef.current && 'handleResize' in controlsRef.current) {
        (controlsRef.current as any).handleResize();
      }
      setCanvasRect(container.getBoundingClientRect());
    };

    window.addEventListener('resize', handleResize);
    setCanvasRect(container.getBoundingClientRect());

    // 렌더링 루프 (Three.js 렌더러만 실행하고 React 상태는 건드리지 않음)
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (controlsRef.current) {
        controlsRef.current.removeEventListener('change', handleControlsChange);
        controlsRef.current.dispose();
      }
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // 1-1. orbitMode 동적 전환 시 컨트롤러 교체
  useEffect(() => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!camera || !renderer) return;

    const curTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(0, 0, 0);
    createControls(orbitMode, camera, renderer.domElement, curTarget);
  }, [orbitMode, createControls]);

  // 2. 모델 지오메트리 로드 및 중심 정렬
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls || meshes.length === 0) return;

    // 기존 메쉬 및 엣지 정리
    const modelGroup = modelGroupRef.current;
    const edgeGroup = edgeGroupRef.current;
    while (modelGroup.children.length > 0) {
      const obj = modelGroup.children[0] as THREE.Mesh;
      modelGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) (obj.material as THREE.Material).dispose();
    }
    while (edgeGroup.children.length > 0) {
      const obj = edgeGroup.children[0] as THREE.LineSegments;
      edgeGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) (obj.material as THREE.Material).dispose();
    }

    // 모델 변경 시 기존 측정값 및 하이라이트 초기화
    setMeasurements([]);
    setSelectedA(null);
    setHoverSnap(null);
    dimensionRendererRef.current?.clearAll();
    onMeasurementsChange?.([]);

    // 모델 중심점 계산
    const centerX = (boundingBox.min[0] + boundingBox.max[0]) / 2;
    const centerY = (boundingBox.min[1] + boundingBox.max[1]) / 2;
    const centerZ = (boundingBox.min[2] + boundingBox.max[2]) / 2;

    // 원형 홀 좌표계도 월드 기준 오프셋 적용
    worldCirclesRef.current = detectedCircles.map((c) => ({
      ...c,
      center: [c.center[0] - centerX, c.center[1] - centerY, c.center[2] - centerZ],
    }));
    (window as any).__WORLD_CIRCLES__ = worldCirclesRef.current;

    // 메쉬 객체 생성
    for (const m of meshes) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
      geom.setIndex(new THREE.BufferAttribute(m.indices, 1));

      // 부품 색상 또는 기본 메탈릭 재질
      const meshColor = m.color
        ? new THREE.Color(m.color[0], m.color[1], m.color[2])
        : new THREE.Color(0xb0bcc9); // 세련된 실버 알루미늄

      const mat = new THREE.MeshStandardMaterial({
        color: meshColor,
        metalness: 0.25,
        roughness: 0.35,
        side: THREE.DoubleSide,
      });

      const meshObj = new THREE.Mesh(geom, mat);
      meshObj.name = m.name;
      meshObj.userData.color = meshColor;
      modelGroup.add(meshObj);

      // 모서리 강조용 EdgesGeometry
      const edgesGeom = new THREE.EdgesGeometry(geom, 24);
      meshObj.userData.edgesGeometry = edgesGeom;

      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x24292f, // 어두운 차콜 라인
        linewidth: 1,
      });
      const edgeObj = new THREE.LineSegments(edgesGeom, edgeMat);
      edgeGroup.add(edgeObj);
    }

    // 모델 중심을 (0, 0, 0)으로 이동
    modelGroup.position.set(-centerX, -centerY, -centerZ);
    edgeGroup.position.set(-centerX, -centerY, -centerZ);

    const maxDim = Math.max(...boundingBox.size);

    // 조명 위치를 모델 크기에 맞게 동적 조정
    if (sceneRef.current) {
      const lights = sceneRef.current.children.filter((c): c is THREE.DirectionalLight => c instanceof THREE.DirectionalLight);
      if (lights[0]) lights[0].position.set(maxDim * 2, maxDim * 3, maxDim * 2);
      if (lights[1]) lights[1].position.set(-maxDim * 2, -maxDim * 2, -maxDim * 2);
    }

    // 치수 렌더러에 모델 스케일 전달
    dimensionRendererRef.current?.setModelScale(maxDim);

    // 카메라 원위치 줌 핏 (Auto-fit)
    fitCameraToObject(maxDim);
  }, [meshes, boundingBox]);

  // 바닥 그리드(눈금선) 제어 (showGrid가 true일 때만 생성)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current.dispose();
      gridHelperRef.current = null;
    }

    if (showGrid && boundingBox) {
      const maxDim = Math.max(...boundingBox.size);
      const gridSize = Math.max(maxDim * 2.5, 100);
      const grid = new THREE.GridHelper(gridSize, 40, 0x30363d, 0x161b22);
      grid.position.y = -boundingBox.size[1] / 2 - 1;
      scene.add(grid);
      gridHelperRef.current = grid;
    }
  }, [showGrid, boundingBox]);

  // 카메라 자동 맞춤 헬퍼
  const fitCameraToObject = (maxDim: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    // 모델 크기에 맞춰 near / far 및 거리 동적 계산
    camera.near = Math.max(0.1, maxDim / 1000);
    camera.far = Math.max(100000, maxDim * 30);

    const fov = camera.fov * (Math.PI / 180);
    const cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6;

    camera.position.set(cameraDist, cameraDist * 0.75, cameraDist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    if ('maxDistance' in controls) {
      (controls as any).maxDistance = camera.far * 0.8;
    }
    controls.update();
  };

  // 3. 렌더 모드(음영, 모서리, 와이어프레임) 변경 반영
  useEffect(() => {
    const modelGroup = modelGroupRef.current;
    const edgeGroup = edgeGroupRef.current;

    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.wireframe = renderMode === 'wireframe';
        child.visible = renderMode !== 'wireframe';
      }
    });

    edgeGroup.visible = renderMode === 'edges' || renderMode === 'wireframe';
  }, [renderMode]);

  // 4. 단면 절단(Clipping Plane) 및 솔리드 캡핑(Solid Capping) 제어
  useEffect(() => {
    const plane = clippingPlaneRef.current;
    const normal = new THREE.Vector3(
      clipAxis === 'x' ? -1 : 0,
      clipAxis === 'y' ? -1 : 0,
      clipAxis === 'z' ? -1 : 0
    );
    const maxDim = Math.max(...boundingBox.size);
    const constant = (clipOffset / 100) * (maxDim / 2);

    plane.normal.copy(normal);
    plane.constant = constant;

    const modelGroup = modelGroupRef.current;
    const edgeGroup = edgeGroupRef.current;
    const clippingGroup = clippingGroupRef.current;

    // 1) 기존 클리핑 스텐실 및 캡 객체 정리
    while (clippingGroup.children.length > 0) {
      const obj = clippingGroup.children[0] as THREE.Object3D;
      clippingGroup.remove(obj);
      if ((obj as any).geometry && !(obj as any).userData?.sharedGeometry) {
        (obj as any).geometry.dispose();
      }
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    }

    // 2) 본체 메쉬 및 모서리 선 클리핑 평면 / 사이드 동기화
    const baseRenderOrder = (meshes.length + 1) * 3;
    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.clippingPlanes = isClippingActive ? [plane] : [];
        child.material.clipShadows = true;
        // 단면 절단 시 내부 빈 뒷면이 투과되지 않도록 FrontSide로 밀폐
        child.material.side = isClippingActive ? THREE.FrontSide : THREE.DoubleSide;
        child.material.needsUpdate = true;
        child.renderOrder = isClippingActive ? baseRenderOrder : 0;
      }
    });

    edgeGroup.traverse((child) => {
      if (child instanceof THREE.LineSegments && child.material instanceof THREE.LineBasicMaterial) {
        child.material.clippingPlanes = isClippingActive ? [plane] : [];
        child.material.needsUpdate = true;
      }
    });

    if (!isClippingActive) return;

    // 3) 스텐실 기반 솔리드 단면 캡(Solid Cap) 생성
    const centerX = (boundingBox.min[0] + boundingBox.max[0]) / 2;
    const centerY = (boundingBox.min[1] + boundingBox.max[1]) / 2;
    const centerZ = (boundingBox.min[2] + boundingBox.max[2]) / 2;

    const capSize = Math.max(maxDim * 4, 300);
    const planeGeom = new THREE.PlaneGeometry(capSize, capSize);

    let partIndex = 0;
    modelGroup.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const geom = child.geometry;
      const partColor = child.userData.color || (child.material as THREE.MeshStandardMaterial).color;

      const currentOrder = partIndex * 3 + 1;

      // 3-1. 스텐실 베이스 재질 (깊이/색상 쓰기 끄고 스텐실만 기록)
      const baseStencilMat = new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        colorWrite: false,
        stencilWrite: true,
        stencilFunc: THREE.AlwaysStencilFunc,
        clippingPlanes: [plane],
      });

      // Back faces: 스텐실 증가 (Increment)
      const backMat = baseStencilMat.clone();
      backMat.side = THREE.BackSide;
      backMat.stencilFail = THREE.IncrementWrapStencilOp;
      backMat.stencilZFail = THREE.IncrementWrapStencilOp;
      backMat.stencilZPass = THREE.IncrementWrapStencilOp;
      const backMesh = new THREE.Mesh(geom, backMat);
      backMesh.userData.sharedGeometry = true;
      backMesh.position.set(-centerX, -centerY, -centerZ);
      backMesh.renderOrder = currentOrder;
      clippingGroup.add(backMesh);

      // Front faces: 스텐실 감소 (Decrement)
      const frontMat = baseStencilMat.clone();
      frontMat.side = THREE.FrontSide;
      frontMat.stencilFail = THREE.DecrementWrapStencilOp;
      frontMat.stencilZFail = THREE.DecrementWrapStencilOp;
      frontMat.stencilZPass = THREE.DecrementWrapStencilOp;
      const frontMesh = new THREE.Mesh(geom, frontMat);
      frontMesh.userData.sharedGeometry = true;
      frontMesh.position.set(-centerX, -centerY, -centerZ);
      frontMesh.renderOrder = currentOrder;
      clippingGroup.add(frontMesh);

      // 3-2. 단면 채움 솔리드 캡 평면 (부품 고유 색상 적용)
      const capMat = new THREE.MeshStandardMaterial({
        color: partColor,
        metalness: 0.15,
        roughness: 0.45,
        side: THREE.DoubleSide,
        stencilWrite: true,
        stencilRef: 0,
        stencilFunc: THREE.NotEqualStencilFunc,
        stencilFail: THREE.ReplaceStencilOp,
        stencilZFail: THREE.ReplaceStencilOp,
        stencilZPass: THREE.ReplaceStencilOp,
        polygonOffset: true,
        polygonOffsetFactor: -0.1,
        polygonOffsetUnits: -0.1,
      });

      const capMesh = new THREE.Mesh(planeGeom, capMat);
      capMesh.renderOrder = currentOrder + 0.5;
      capMesh.onAfterRender = (renderer: any) => {
        if (renderer && typeof renderer.clearStencil === 'function') {
          renderer.clearStencil();
        }
      };

      // 절단 평면 위치 및 법선 벡터 방향으로 정렬
      capMesh.position.copy(plane.normal).multiplyScalar(-plane.constant);
      capMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
      clippingGroup.add(capMesh);

      partIndex++;
    });
  }, [isClippingActive, clipAxis, clipOffset, boundingBox, meshes.length]);

  // 4-1. 바운딩 박스 (AABB / 최소 사이즈 OBB) 3D 시각화 렌더링
  useEffect(() => {
    const group = boundingBoxGroupRef.current;
    while (group.children.length > 0) {
      const obj = group.children[0] as THREE.Object3D;
      group.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    }

    if (!boundingBoxMode || boundingBoxMode === 'none') return;

    const centerX = (boundingBox.min[0] + boundingBox.max[0]) / 2;
    const centerY = (boundingBox.min[1] + boundingBox.max[1]) / 2;
    const centerZ = (boundingBox.min[2] + boundingBox.max[2]) / 2;

    if (boundingBoxMode === 'aabb') {
      // 1. AABB (XYZ 축 정렬 바운딩 박스 - 시안/스카이블루 테마)
      const [sx, sy, sz] = boundingBox.size;
      const geom = new THREE.BoxGeometry(sx, sy, sz);
      const edgesGeom = new THREE.EdgesGeometry(geom);

      // 와이어프레임 엣지
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x00f2fe,
        linewidth: 2,
        depthTest: true,
      });
      const line = new THREE.LineSegments(edgesGeom, lineMat);

      // 반투명 면 (공간 인지력 향상)
      const faceMat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geom, faceMat);

      group.add(line);
      group.add(mesh);
    } else if (boundingBoxMode === 'obb' && obb) {
      // 2. 최소 사이즈 OBB (회전 지향 바운딩 박스 - 골드/앰버 테마)
      const [sx, sy, sz] = obb.size;
      const geom = new THREE.BoxGeometry(sx, sy, sz);
      const edgesGeom = new THREE.EdgesGeometry(geom);

      // 골드/앰버 와이어프레임 엣지
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xffb700,
        linewidth: 2,
        depthTest: true,
      });
      const line = new THREE.LineSegments(edgesGeom, lineMat);

      // 반투명 면
      const faceMat = new THREE.MeshBasicMaterial({
        color: 0xffb700,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geom, faceMat);

      // 모델 중심 오프셋 적용
      const worldCenter = new THREE.Vector3(
        obb.center[0] - centerX,
        obb.center[1] - centerY,
        obb.center[2] - centerZ
      );
      const quat = new THREE.Quaternion(...obb.quaternion);

      line.position.copy(worldCenter);
      line.quaternion.copy(quat);
      mesh.position.copy(worldCenter);
      mesh.quaternion.copy(quat);

      group.add(line);
      group.add(mesh);
    }
  }, [boundingBoxMode, boundingBox, obb]);

  // 5. 카메라 뷰 프리셋 전환
  useEffect(() => {
    if (!viewPreset) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const maxDim = Math.max(...boundingBox.size);
    const dist = maxDim * 2.2;

    switch (viewPreset) {
      case 'top':
        camera.position.set(0, dist, 0.001);
        break;
      case 'bottom':
        camera.position.set(0, -dist, 0.001);
        break;
      case 'front':
        camera.position.set(0, 0, dist);
        break;
      case 'back':
        camera.position.set(0, 0, -dist);
        break;
      case 'left':
        camera.position.set(-dist, 0, 0);
        break;
      case 'right':
        camera.position.set(dist, 0, 0);
        break;
      case 'iso':
        camera.position.set(dist * 0.7, dist * 0.7, dist * 0.7);
        break;
    }

    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }, [viewPreset, resetTrigger]);

  // 6. 마우스 조작 버튼 설정 (일반 모드 & 측정 모드 동일: 좌클릭 회전, 휠버튼 이동) 및 ESC 키 리스너
  useEffect(() => {
    const controls = controlsRef.current;
    if (controls) {
      // 일반/측정 모드 공통: 좌클릭 드래그=회전, 휠버튼 드래그=이동(Pan)
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
      };
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedA) {
        setSelectedA(null);
        dimensionRendererRef.current?.updateSelection(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedA]);

  // 7. 마우스 누름 시점 추적 (드래그 회전/이동과 단순 클릭 분리용)
  const handlePointerDown = (e: React.PointerEvent) => {
    // HUD 패널 등 UI 컨트롤 클릭 시 3D 인터랙션 방지
    const targetEl = e.target as HTMLElement | null;
    if (targetEl && targetEl !== rendererRef.current?.domElement && targetEl !== containerRef.current) {
      return;
    }

    pointerDownPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    isDraggingRef.current = false;
  };

  // 8. 마우스 우클릭 시 기본 브라우저 메뉴 차단
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // 9. 마우스 호버 시 스마트 스냅 감지 핸들러
  const handlePointerMove = (e: React.PointerEvent) => {
    // HUD 패널 등 UI 컨트롤 위에서는 3D 스냅 호버 해제 및 조작 방지
    const targetEl = e.target as HTMLElement | null;
    if (targetEl && targetEl !== rendererRef.current?.domElement && targetEl !== containerRef.current) {
      if (hoverSnap) {
        setHoverSnap(null);
        dimensionRendererRef.current?.updateHover(null);
      }
      return;
    }

    // 버튼이 눌린 상태에서 4px 이상 이동 시 화면 조작(드래그)으로 판정
    if (e.buttons > 0) {
      const dist = Math.hypot(
        e.clientX - pointerDownPosRef.current.x,
        e.clientY - pointerDownPosRef.current.y
      );
      if (dist > 4) {
        isDraggingRef.current = true;
      }
    }

    if (!isMeasureMode || !containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    const meshes = modelGroupRef.current.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);

    const snap = snappingEngineRef.current.snap(
      e.clientX,
      e.clientY,
      rect,
      cameraRef.current,
      meshes,
      worldCirclesRef.current
    );

    setHoverSnap(snap);
    if (dimensionRendererRef.current) {
      dimensionRendererRef.current.updateHover(snap);
    }
  };

  // 10. 마우스 클릭 시 치수 측정 산출 및 빈 공간 클릭 시 취소 핸들러
  const handleClick = (e: React.MouseEvent) => {
    if (!isMeasureMode) return;

    // ⭐ HUD 패널, 오버레이 버튼 등 2D UI 요소를 클릭한 경우 3D 캔버스 클릭 이벤트 전면 차단
    const targetEl = e.target as HTMLElement | null;
    if (targetEl && targetEl !== rendererRef.current?.domElement && targetEl !== containerRef.current) {
      return;
    }

    // ⭐ 드래그 판별: 드래그 중이었거나 마우스가 4px 이상 움직였거나 300ms 이상 누르고 있었다면 화면 조작이므로 클릭 무시!
    const moveDist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );
    const elapsed = Date.now() - pointerDownPosRef.current.time;

    if (isDraggingRef.current || moveDist > 4 || elapsed > 300) {
      return; // 화면 회전/이동 조작이므로 무시
    }

    const rect = containerRef.current?.getBoundingClientRect();
    const meshes = modelGroupRef.current.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
    const snap = (rect && cameraRef.current ? snappingEngineRef.current.snap(
      e.clientX,
      e.clientY,
      rect,
      cameraRef.current,
      meshes,
      worldCirclesRef.current
    ) : null) || hoverSnap;

    // ⭐ 모델링이 아닌 빈 배경을 좌클릭한 경우: 1번 기준점 선택 취소!
    if (!snap) {
      if (selectedA) {
        setSelectedA(null);
        dimensionRendererRef.current?.updateSelection(null);
      }
      return;
    }

    // 동일 스냅 요소 판별 헬퍼
    const isSameSnap = (a: SnapElement, b: SnapElement) => {
      if (a.type !== b.type) return false;
      const pA = a.center || a.point;
      const pB = b.center || b.point;
      return Math.hypot(pA[0] - pB[0], pA[1] - pB[1], pA[2] - pB[2]) < 0.5;
    };

    // [경우 1: 1번 기준점 미선택 시 -> 1번 요소로 선택]
    if (!selectedA) {
      setSelectedA(snap);
      dimensionRendererRef.current?.updateSelection(snap);
      return;
    }

    // [경우 2: 동일한 요소를 다시 클릭한 경우 -> 단독 측정 등록 후 종료]
    if (isSameSnap(selectedA, snap)) {
      if (snap.type === 'circle') {
        const singleMeasure = DimensionCalculator.calculateSingle(snap);
        if (singleMeasure) {
          setMeasurements((prev) => {
            const updated = [...prev, singleMeasure];
            onMeasurementsChange?.(updated);
            dimensionRendererRef.current?.renderMeasurements(updated);
            return updated;
          });
        }
      }
      setSelectedA(null);
      dimensionRendererRef.current?.updateSelection(null);
      return;
    }

    // [경우 3: 2번 요소 선택 -> 인벤터 스타일 요소 간 거리 자동 산출]
    // (원과 원: 중심간 거리, 평면과 평면: 면간 거리, 그 외: 최단 거리)
    const pairMeasure = DimensionCalculator.calculatePair(selectedA, snap);
    setMeasurements((prev) => {
      const updated = [...prev, pairMeasure];
      onMeasurementsChange?.(updated);
      dimensionRendererRef.current?.renderMeasurements(updated);
      return updated;
    });

    // 선택 초기화 (다음 측정을 위해 대기)
    setSelectedA(null);
    dimensionRendererRef.current?.updateSelection(null);
  };

  // E2E 테스트 및 검증용 전역 훅
  useEffect(() => {
    (window as any).__TRIGGER_PAIR_MEASURE__ = (snap1: any, snap2: any) => {
      const pair = DimensionCalculator.calculatePair(snap1, snap2);
      setMeasurements([pair]);
      onMeasurementsChange?.([pair]);
      dimensionRendererRef.current?.renderMeasurements([pair]);
    };
    (window as any).__ADD_PAIR_MEASURE__ = (snap1: any, snap2: any) => {
      const pair = DimensionCalculator.calculatePair(snap1, snap2);
      setMeasurements((prev) => {
        const updated = [...prev, pair];
        onMeasurementsChange?.(updated);
        dimensionRendererRef.current?.renderMeasurements(updated);
        return updated;
      });
    };
  }, []);

  // 치수 개별 삭제
  const handleRemoveMeasurement = (id: string) => {
    setMeasurements((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      onMeasurementsChange?.(updated);
      dimensionRendererRef.current?.renderMeasurements(updated);
      return updated;
    });
  };

  // 모든 치수 삭제
  const handleClearAll = () => {
    setMeasurements([]);
    setSelectedA(null);
    onMeasurementsChange?.([]);
    dimensionRendererRef.current?.renderMeasurements([]);
    dimensionRendererRef.current?.updateSelection(null);
  };

  // 동적 커서 스타일 직접 제어 (측정 스냅 시 정밀 십자선 crosshair, 일반 시 기본 화살표 default)
  useEffect(() => {
    const cursor = isMeasureMode
      ? (hoverSnap ? 'crosshair' : 'default')
      : 'default';

    if (containerRef.current) {
      containerRef.current.style.cursor = cursor;
    }
    if (rendererRef.current?.domElement) {
      rendererRef.current.domElement.style.cursor = cursor;
    }
  }, [isMeasureMode, hoverSnap]);

  // 인벤터식 원통 측정 옵션 (중심간 / 최소 / 최대) 실시간 업데이트
  const handleUpdateCircleOption = (id: string, option: 'center' | 'min' | 'max') => {
    setMeasurements((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== id || m.type !== 'center_to_center' || !m.details || !m.snapB) return m;

        // 두 원의 중심점 및 반지름
        const cA = new THREE.Vector3(...(m.snapA.center || m.snapA.point));
        const cB = new THREE.Vector3(...(m.snapB.center || m.snapB.point));
        const rA = m.snapA.radius || 0;
        const rB = m.snapB.radius || 0;

        const dir = new THREE.Vector3().subVectors(cB, cA);
        const centerDist = dir.length();
        if (centerDist > 0.0001) {
          dir.normalize();
        }

        let pA = cA.clone();
        let pB = cB.clone();
        let newValue = centerDist;
        let labelPrefix = '중심간';

        if (option === 'center') {
          newValue = Number(centerDist.toFixed(2));
          labelPrefix = '중심간';
          pA = cA;
          pB = cB;
        } else if (option === 'min') {
          newValue = Math.max(0, Number((centerDist - (rA + rB)).toFixed(2)));
          labelPrefix = '최소(안쪽)';
          pA = cA.clone().add(dir.clone().multiplyScalar(rA));
          pB = cB.clone().sub(dir.clone().multiplyScalar(rB));
        } else if (option === 'max') {
          newValue = Number((centerDist + (rA + rB)).toFixed(2));
          labelPrefix = '최대(바깥)';
          pA = cA.clone().sub(dir.clone().multiplyScalar(rA));
          pB = cB.clone().add(dir.clone().multiplyScalar(rB));
        }

        const isInch = unit === 'in';
        const unitStr = isInch ? 'in' : 'mm';
        const displayVal = isInch ? (newValue / 25.4).toFixed(2) : newValue.toFixed(2);
        const newLabel = `${labelPrefix} ${displayVal} ${unitStr}`;

        return {
          ...m,
          value: newValue,
          label: newLabel,
          circleOption: option,
          startPoint: [pA.x, pA.y, pA.z] as [number, number, number],
          endPoint: [pB.x, pB.y, pB.z] as [number, number, number],
        };
      });
      onMeasurementsChange?.(updated);
      dimensionRendererRef.current?.renderMeasurements(updated);
      return updated;
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerLeave={() => {
        setHoverSnap(null);
        dimensionRendererRef.current?.updateHover(null);
      }}
    >
      {/* 2D 스크린 좌표 투영 치수 라벨 및 스냅 오버레이 */}
      <DimensionOverlay
        measurements={measurements}
        hoverSnap={hoverSnap}
        selectedA={selectedA}
        camera={cameraRef.current}
        canvasRect={canvasRect}
        isMeasureMode={isMeasureMode}
        unit={unit}
        onUnitChange={onUnitChange}
        onRemoveMeasurement={handleRemoveMeasurement}
        onClearAll={handleClearAll}
        onUpdateCircleOption={handleUpdateCircleOption}
      />
    </div>
  );
};
