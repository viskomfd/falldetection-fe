import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type StoryPhase = "sitting" | "standing" | "falling" | "alert";

const MODEL_PATHS = {
  armchair: "/models/hero/armchair.glb",
  sideboard: "/models/hero/sideboard.glb",
  plant: "/models/hero/plant.glb",
  cctv: "/models/hero/cctv.glb",
  grandpa: "/models/hero/grandpa-animated.glb",
  grandpaStatic: "/models/hero/grandpa.glb",
} as const;

const CYCLE_DURATION = 16.2;

// Key spatial coordinates (in meters) for our living-room stage
// Positioned on the right half so sitting, walking, and falling stay clear of Hero copy & CTAs
const CHAIR_POS = new THREE.Vector3(1.86, 0, -0.46);
const SIT_POS = new THREE.Vector3(1.78, 0.09, -0.14);
const STAND_END_POS = new THREE.Vector3(1.68, 0, 0.02);
const CCTV_POS = new THREE.Vector3(2.48, 2.12, -0.84);
const GRANDPA_MIXAMO_SCALE = 66;
const FALL_TIME_SCALE = 0.56;

const WHITE_BEAM = new THREE.Color("#ffffff");
const RED_BEAM = new THREE.Color("#ef4444");
const SAFE_LED = new THREE.Color("#10b981");
const ALERT_LED = new THREE.Color("#ef4444");

function createVolumetricBeamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uColor: { value: WHITE_BEAM.clone() },
      uOpacity: { value: 0.28 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        // vUv.y = 1.0 at cone apex (lens), 0.0 at wide base (floor)
        float verticalFade = smoothstep(0.0, 0.85, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        float edgeSoftness = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 0.85);
        float alpha = verticalFade * edgeSoftness * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

function buildLivingRoomShell(scene: THREE.Scene) {
  const room = new THREE.Group();

  // 1. Warm low-poly oak floor
  const floorGeo = new THREE.PlaneGeometry(14, 10, 14, 10);
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#eedcc9",
    roughness: 0.88,
    metalness: 0.02,
    flatShading: true,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0.6, 0, 0.5);
  floor.receiveShadow = true;
  room.add(floor);

  // Subtle plank accent strips
  const plankColors = ["#e8d4bf", "#f2e4d3", "#ebd8c4"] as const;
  for (let i = 0; i < 6; i++) {
    const plankColor = plankColors[i % plankColors.length] ?? "#e8d4bf";
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 0.48),
      new THREE.MeshStandardMaterial({
        color: plankColor,
        roughness: 0.9,
        transparent: true,
        opacity: 0.45,
      }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0.6, 0.002, -1.6 + i * 0.95);
    strip.receiveShadow = true;
    room.add(strip);
  }

  // 2. Woven geometric area rug (walking & fall stage)
  const rugOuter = new THREE.Mesh(
    new THREE.BoxGeometry(3.45, 0.018, 2.45),
    new THREE.MeshStandardMaterial({ color: "#d7e2df", roughness: 0.96, flatShading: true }),
  );
  rugOuter.position.set(1.06, 0.009, 0.34);
  rugOuter.receiveShadow = true;
  room.add(rugOuter);

  const rugInner = new THREE.Mesh(
    new THREE.BoxGeometry(3.05, 0.02, 2.08),
    new THREE.MeshStandardMaterial({ color: "#ecf2f0", roughness: 0.96, flatShading: true }),
  );
  rugInner.position.set(1.06, 0.011, 0.34);
  rugInner.receiveShadow = true;
  room.add(rugInner);

  // 3. Back-right Rumi teal faceted accent wall (matching Reference Image 3)
  const tealWallGeo = new THREE.PlaneGeometry(6.8, 3.6, 6, 4);
  const posAttr = tealWallGeo.getAttribute("position");
  if (posAttr) {
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      // Keep border edges straight; add tiny low-poly depth ripples inside for faceted light catch
      if (Math.abs(x) < 3.1 && Math.abs(y) < 1.55) {
        posAttr.setZ(i, Math.sin(x * 1.9 + y * 2.3) * 0.032);
      }
    }
    tealWallGeo.computeVertexNormals();
  }

  const tealWallMat = new THREE.MeshStandardMaterial({
    color: "#2e9083",
    roughness: 0.82,
    metalness: 0.03,
    flatShading: true,
  });
  const tealWall = new THREE.Mesh(tealWallGeo, tealWallMat);
  tealWall.position.set(2.25, 1.8, -1.88);
  tealWall.rotation.y = -0.22;
  tealWall.receiveShadow = true;
  room.add(tealWall);

  // Baseboard along teal wall
  const baseboard = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.14, 0.06),
    new THREE.MeshStandardMaterial({ color: "#dfeae6", roughness: 0.75 }),
  );
  baseboard.position.set(2.25, 0.07, -1.85);
  baseboard.rotation.y = -0.22;
  baseboard.receiveShadow = true;
  room.add(baseboard);

  // Two warm-oak framed low-poly paintings on far-right wall
  const frameMat = new THREE.MeshStandardMaterial({
    color: "#c68652",
    roughness: 0.72,
    flatShading: true,
  });
  const canvasMat = new THREE.MeshStandardMaterial({
    color: "#eef6f4",
    roughness: 0.9,
  });
  const hillMat = new THREE.MeshStandardMaterial({
    color: "#8ebcb3",
    roughness: 0.85,
    flatShading: true,
  });

  const frameSpecs = [
    { x: 3.62, y: 1.78, w: 0.86, h: 0.64 },
    { x: 3.68, y: 1.02, w: 0.78, h: 0.56 },
  ];
  for (const spec of frameSpecs) {
    const fGroup = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h, 0.045), frameMat);
    outer.castShadow = true;
    fGroup.add(outer);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(spec.w - 0.1, spec.h - 0.1), canvasMat);
    inner.position.z = 0.025;
    fGroup.add(inner);
    const art = new THREE.Mesh(new THREE.ConeGeometry(spec.w * 0.24, spec.h * 0.35, 3), hillMat);
    art.position.set(-0.08, -0.07, 0.032);
    art.rotation.z = 0.06;
    fGroup.add(art);

    fGroup.position.set(spec.x, spec.y, -1.52);
    fGroup.rotation.y = -0.22;
    room.add(fGroup);
  }

  // 4. Back-left sunlit wall & window backdrop
  const leftWallMat = new THREE.MeshStandardMaterial({
    color: "#edf4f2",
    roughness: 0.86,
    flatShading: true,
  });
  const leftWallTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.75, 0.18), leftWallMat);
  leftWallTop.position.set(-2.5, 3.22, -1.85);
  leftWallTop.rotation.y = 0.18;
  room.add(leftWallTop);

  const leftWallBottom = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.65, 0.18), leftWallMat);
  leftWallBottom.position.set(-2.5, 0.32, -1.85);
  leftWallBottom.rotation.y = 0.18;
  leftWallBottom.receiveShadow = true;
  room.add(leftWallBottom);

  // Bright sky plane outside window
  const skyPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 3.6),
    new THREE.MeshBasicMaterial({ color: "#d7eef9" }),
  );
  skyPlane.position.set(-2.45, 1.85, -2.55);
  skyPlane.rotation.y = 0.18;
  room.add(skyPlane);

  // Low-poly sunlit outdoor trees visible through window
  const treeColors = ["#b5df9d", "#9dce85", "#c8e8b4"] as const;
  const treeSpecs: ReadonlyArray<readonly [number, number, number, number]> = [
    [-1.4, 1.25, -2.35, 0.72],
    [-1.95, 1.68, -2.4, 0.85],
    [-0.95, 1.05, -2.3, 0.56],
    [-2.5, 1.35, -2.42, 0.74],
  ];
  treeSpecs.forEach(([tx, ty, tz, rad], idx) => {
    const treeColor = treeColors[idx % treeColors.length] ?? "#b5df9d";
    const foliage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(rad, 0),
      new THREE.MeshStandardMaterial({
        color: treeColor,
        roughness: 0.88,
        flatShading: true,
      }),
    );
    foliage.position.set(tx, ty, tz);
    room.add(foliage);
  });

  // White window mullions
  const mullionMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 });
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.075, 2.35, 0.08), mullionMat);
  vBar.position.set(-1.55, 1.78, -1.96);
  vBar.rotation.y = 0.18;
  room.add(vBar);

  const hBar = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.07, 0.08), mullionMat);
  hBar.position.set(-1.7, 1.74, -1.94);
  hBar.rotation.y = 0.18;
  room.add(hBar);

  // Faceted teal curtain hanging between window and accent wall
  const curtainGroup = new THREE.Group();
  const curtainColors = ["#6ac0b2", "#52a89a", "#44978a"] as const;
  curtainColors.forEach((curtainColor, i) => {
    const pleat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 2.86, 5),
      new THREE.MeshStandardMaterial({
        color: curtainColor,
        roughness: 0.86,
        flatShading: true,
      }),
    );
    pleat.position.set(-0.62 + i * 0.14, 1.46, -1.92 - i * 0.03);
    pleat.castShadow = true;
    pleat.receiveShadow = true;
    curtainGroup.add(pleat);
  });
  room.add(curtainGroup);

  // 5. Ceiling plane
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    new THREE.MeshStandardMaterial({ color: "#dfe9e6", roughness: 0.92 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0.6, 3.22, 0.2);
  room.add(ceiling);

  // Ceiling beam soffit above window
  const soffit = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.24, 0.45),
    new THREE.MeshStandardMaterial({ color: "#e8f0ee", roughness: 0.85 }),
  );
  soffit.position.set(-2.2, 3.12, -1.78);
  soffit.rotation.y = 0.18;
  room.add(soffit);

  // 6. Small wooden side table beside armchair (matches Reference Image 3)
  const sideTable = new THREE.Group();
  const oakMat = new THREE.MeshStandardMaterial({
    color: "#d49c68",
    roughness: 0.72,
    flatShading: true,
  });
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.045, 0.44), oakMat);
  tableTop.position.y = 0.46;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  sideTable.add(tableTop);

  const legOffsets: ReadonlyArray<readonly [number, number]> = [
    [-0.21, -0.16],
    [0.21, -0.16],
    [-0.21, 0.16],
    [0.21, 0.16],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.46, 5), oakMat);
    leg.position.set(lx, 0.23, lz);
    leg.castShadow = true;
    sideTable.add(leg);
  }

  // Stacked teal book + ceramic mug on side table
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.036, 0.13),
    new THREE.MeshStandardMaterial({ color: "#2d8d80", roughness: 0.8, flatShading: true }),
  );
  book.position.set(-0.08, 0.5, 0.04);
  book.rotation.y = 0.18;
  book.castShadow = true;
  sideTable.add(book);

  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.03, 0.075, 7),
    new THREE.MeshStandardMaterial({ color: "#faf7f2", roughness: 0.55, flatShading: true }),
  );
  mug.position.set(0.12, 0.52, -0.02);
  mug.castShadow = true;
  sideTable.add(mug);

  sideTable.position.set(1.0, 0, -0.52);
  sideTable.rotation.y = 0.14;
  room.add(sideTable);

  // 7. Sideboard tabletop decor (matching Reference Image 3: books, photo frame, mini plant)
  const decorGroup = new THREE.Group();
  const sBook1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.055, 0.2),
    new THREE.MeshStandardMaterial({ color: "#2d8d80", roughness: 0.78, flatShading: true }),
  );
  sBook1.position.set(-0.42, 0.85, 0.02);
  sBook1.castShadow = true;
  decorGroup.add(sBook1);

  const sBook2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.048, 0.18),
    new THREE.MeshStandardMaterial({ color: "#4da698", roughness: 0.78, flatShading: true }),
  );
  sBook2.position.set(-0.43, 0.902, 0.02);
  sBook2.rotation.y = 0.08;
  sBook2.castShadow = true;
  decorGroup.add(sBook2);

  // Small portrait frame on sideboard
  const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.03), frameMat);
  pFrame.position.set(0.06, 0.96, -0.02);
  pFrame.rotation.x = -0.1;
  pFrame.castShadow = true;
  decorGroup.add(pFrame);

  const pMat = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.22), canvasMat);
  pMat.position.set(0.06, 0.96, 0.002);
  pMat.rotation.x = -0.1;
  decorGroup.add(pMat);

  // Mini potted plant on right edge of sideboard
  const miniPot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.065, 0.15, 7),
    new THREE.MeshStandardMaterial({ color: "#f6f8f7", roughness: 0.65, flatShading: true }),
  );
  miniPot.position.set(0.42, 0.895, 0.02);
  miniPot.castShadow = true;
  decorGroup.add(miniPot);

  const leafMat = new THREE.MeshStandardMaterial({
    color: "#76b852",
    roughness: 0.78,
    flatShading: true,
  });
  const miniLeaves: ReadonlyArray<readonly [number, number, number, number]> = [
    [0.42, 1.04, 0.02, 0.08],
    [0.37, 1.02, 0.04, 0.065],
    [0.47, 1.03, 0.01, 0.07],
  ];
  for (const [lx, ly, lz, lr] of miniLeaves) {
    const lf = new THREE.Mesh(new THREE.OctahedronGeometry(lr, 0), leafMat);
    lf.position.set(lx, ly, lz);
    lf.scale.set(0.85, 1.45, 0.65);
    lf.castShadow = true;
    decorGroup.add(lf);
  }

  decorGroup.position.set(3.1, 0, -1.18);
  decorGroup.rotation.y = -0.22;
  room.add(decorGroup);

  scene.add(room);
}

function findClip(clips: THREE.AnimationClip[], keywords: string[]) {
  for (const kw of keywords) {
    const found = clips.find((c) => c.name.toLowerCase().includes(kw));
    if (found) return found;
  }
  return null;
}

function enableMeshShadows(root: THREE.Object3D, flatStyle = false) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj instanceof THREE.SkinnedMesh) {
        obj.frustumCulled = false;
      }
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.roughness = Math.max(mat.roughness, 0.74);
          mat.metalness = Math.min(mat.metalness, 0.08);
          if (flatStyle) {
            mat.flatShading = true;
            mat.needsUpdate = true;
          }
        }
      }
    }
  });
}

export function Hero3DScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<StoryPhase>("sitting");
  const [alertVisible, setAlertVisible] = useState(false);
  const [lockScreenPos, setLockScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(container.clientWidth || 1440, container.clientHeight || 860);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f3f8f6");

    const camera = new THREE.PerspectiveCamera(
      34,
      (container.clientWidth || 1440) / (container.clientHeight || 860),
      0.1,
      40,
    );
    camera.position.set(-0.26, 1.62, 4.92);
    camera.lookAt(0.46, 0.9, -0.2);

    // Warm Pixar-style studio + sunlit window lighting
    const hemiLight = new THREE.HemisphereLight("#f7fbf9", "#e7d5c3", 1.15);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight("#fffaf0", 1.75);
    sunLight.position.set(-4.2, 4.6, 2.4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 14;
    sunLight.shadow.camera.left = -4.5;
    sunLight.shadow.camera.right = 4.5;
    sunLight.shadow.camera.top = 4.2;
    sunLight.shadow.camera.bottom = -2.2;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight("#d6f2ec", 0.55);
    fillLight.position.set(3.2, 2.2, 3.6);
    scene.add(fillLight);

    // Living room shell
    buildLivingRoomShell(scene);

    // CCTV real 3D SpotLight + volumetric beam cone
    const cctvTarget = new THREE.Object3D();
    cctvTarget.position.set(SIT_POS.x, 0.85, SIT_POS.z);
    scene.add(cctvTarget);

    const cctvSpot = new THREE.SpotLight("#ffffff", 2.2, 9.5, Math.PI / 5.4, 0.65, 1.1);
    cctvSpot.position.copy(CCTV_POS);
    cctvSpot.target = cctvTarget;
    scene.add(cctvSpot);

    const beamMat = createVolumetricBeamMaterial();
    const beamLength = 4.1;
    const beamGeo = new THREE.ConeGeometry(1.18, beamLength, 24, 1, true);
    // Shift geometry so apex sits at local origin and opens along +Z
    beamGeo.translate(0, -beamLength / 2, 0);
    beamGeo.rotateX(-Math.PI / 2);
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.copy(CCTV_POS).add(new THREE.Vector3(-0.08, -0.06, 0.06));
    beamMesh.lookAt(cctvTarget.position);
    scene.add(beamMesh);

    // CCTV status LED indicator dot
    const ledMat = new THREE.MeshBasicMaterial({ color: SAFE_LED.clone() });
    const ledDot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), ledMat);
    ledDot.position.copy(CCTV_POS).add(new THREE.Vector3(-0.14, -0.06, 0.14));
    scene.add(ledDot);

    // Loader
    const loader = new GLTFLoader();

    let disposed = false;
    let mixer: THREE.AnimationMixer | null = null;
    let grandpaRoot: THREE.Object3D | null = null;
    let hipsBone: THREE.Object3D | null = null;
    const grandpaMaterials: THREE.MeshStandardMaterial[] = [];
    const actions: Partial<Record<"sitting" | "standing" | "falling", THREE.AnimationAction>> = {};
    let currentAction: THREE.AnimationAction | null = null;

    function setGrandpaOpacity(alpha: number) {
      const clamped = THREE.MathUtils.clamp(alpha, 0, 1);
      const isFading = clamped < 0.995;
      for (const mat of grandpaMaterials) {
        if (mat.transparent !== isFading) {
          mat.transparent = isFading;
          mat.depthWrite = !isFading;
          mat.needsUpdate = true;
        }
        mat.opacity = clamped;
      }
      if (grandpaRoot) {
        grandpaRoot.visible = clamped > 0.01;
      }
    }

    function playClip(key: "sitting" | "standing" | "falling", fadeSec = 0.3) {
      const next = actions[key];
      if (!next || next === currentAction) return;
      next.reset();
      if (key === "falling" || key === "standing") {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
      } else {
        next.setLoop(THREE.LoopRepeat, Infinity);
      }
      next.play();
      if (currentAction) {
        currentAction.crossFadeTo(next, fadeSec, false);
      }
      currentAction = next;
    }

    async function loadAssets() {
      const loadOptional = async (url: string) => {
        try {
          return await loader.loadAsync(url);
        } catch {
          return null;
        }
      };

      const [armchairGltf, sideboardGltf, plantGltf, cctvGltf, grandpaAnimGltf] = await Promise.all(
        [
          loadOptional(MODEL_PATHS.armchair),
          loadOptional(MODEL_PATHS.sideboard),
          loadOptional(MODEL_PATHS.plant),
          loadOptional(MODEL_PATHS.cctv),
          loadOptional(MODEL_PATHS.grandpa),
        ],
      );

      if (disposed) return;

      if (armchairGltf) {
        const obj = armchairGltf.scene;
        enableMeshShadows(obj);
        // Lower seat cushion height so Grandpa's thighs sit cleanly on top with zero clipping
        obj.scale.set(1.12, 0.78, 1.04);
        obj.position.copy(CHAIR_POS);
        obj.rotation.y = -0.34;
        scene.add(obj);
      }

      if (sideboardGltf) {
        const obj = sideboardGltf.scene;
        enableMeshShadows(obj);
        obj.position.set(3.1, 0, -1.18);
        obj.rotation.y = -0.22;
        scene.add(obj);
      }

      if (plantGltf) {
        const obj = plantGltf.scene;
        enableMeshShadows(obj);
        obj.scale.setScalar(1.05);
        obj.position.set(1.22, 0, -1.16);
        obj.rotation.y = 0.25;
        scene.add(obj);
      }

      if (cctvGltf) {
        const obj = cctvGltf.scene;
        enableMeshShadows(obj);
        obj.scale.setScalar(1.38);
        obj.position.copy(CCTV_POS);
        obj.lookAt(SIT_POS.x, 0.72, SIT_POS.z);
        scene.add(obj);
      }

      const activeGrandpa = grandpaAnimGltf ?? (await loadOptional(MODEL_PATHS.grandpaStatic));
      if (disposed) return;

      if (activeGrandpa) {
        grandpaRoot = activeGrandpa.scene;
        enableMeshShadows(grandpaRoot);
        // Mixamo FBX exported in cm -> scale cleanly to cozy Pixar proportions next to the armchair
        const initialBox = new THREE.Box3().setFromObject(grandpaRoot);
        const rawH = initialBox.max.y - initialBox.min.y;
        const scaleFactor = rawH > 0.001 && rawH < 0.2 ? GRANDPA_MIXAMO_SCALE : 1;
        grandpaRoot.scale.setScalar(scaleFactor);
        grandpaRoot.position.copy(SIT_POS);
        grandpaRoot.rotation.y = -0.34;
        scene.add(grandpaRoot);

        grandpaRoot.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            for (const mat of mats) {
              if (mat instanceof THREE.MeshStandardMaterial) {
                grandpaMaterials.push(mat);
              }
            }
          }
        });

        hipsBone =
          grandpaRoot.getObjectByName("mixamorig:Hips") ??
          grandpaRoot.getObjectByName("mixamorigHips") ??
          null;

        if (activeGrandpa.animations.length > 0) {
          mixer = new THREE.AnimationMixer(grandpaRoot);
          const sitClip =
            findClip(activeGrandpa.animations, ["sit", "idle"]) ?? activeGrandpa.animations[0];
          const standClip = findClip(activeGrandpa.animations, ["stand", "rise", "up"]);
          const fallClip = findClip(activeGrandpa.animations, ["fall", "trip", "collapse"]);

          if (sitClip) actions.sitting = mixer.clipAction(sitClip);
          if (standClip) actions.standing = mixer.clipAction(standClip);
          if (fallClip) {
            actions.falling = mixer.clipAction(fallClip);
            actions.falling.timeScale = FALL_TIME_SCALE;
          }

          playClip("sitting", 0);
        }
      }

      setSceneReady(true);
    }

    void loadAssets();

    // Pause rendering when scrolled off-screen or tab hidden
    let isVisible = true;
    const visibilityObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              isVisible = Boolean(entry?.isIntersecting);
            },
            { threshold: 0.05 },
          )
        : null;
    visibilityObserver?.observe(container);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1440;
      const h = container.clientHeight || 860;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    let lastTimeMs = performance.now();
    let elapsed = 0;
    let frozenTime: number | null = null;
    let lastPhase: StoryPhase = "sitting";
    let lastAlert = false;
    let rafId = 0;
    const projected = new THREE.Vector3();
    const liveHipsPos = new THREE.Vector3();
    const tmpColor = new THREE.Color();

    if (import.meta.env.DEV) {
      (window as unknown as { __rumiHeroSeek?: (t: number | null) => void }).__rumiHeroSeek = (
        t: number | null,
      ) => {
        frozenTime = t;
        if (t !== null) {
          elapsed = ((t % CYCLE_DURATION) + CYCLE_DURATION) % CYCLE_DURATION;
          if (mixer) {
            if (elapsed < 3.0 || elapsed >= 15.3) playClip("sitting", 0);
            else if (elapsed < 5.2) playClip("standing", 0);
            else playClip("falling", 0);
            const clipOffset =
              elapsed < 3.0
                ? elapsed
                : elapsed < 5.2
                  ? elapsed - 3.0
                  : elapsed < 15.3
                    ? Math.min((elapsed - 5.2) * FALL_TIME_SCALE, 3.45)
                    : elapsed - 15.3;
            mixer.setTime(clipOffset);
          }
        }
      };
    }

    const tick = () => {
      rafId = window.requestAnimationFrame(tick);
      const nowMs = performance.now();
      const rawDt = Math.min((nowMs - lastTimeMs) / 1000, 0.05);
      lastTimeMs = nowMs;

      if (!isVisible || document.visibilityState === "hidden") {
        return;
      }

      const dt = frozenTime !== null ? 0 : rawDt;
      if (!prefersReducedMotion && frozenTime === null) {
        elapsed = (elapsed + dt) % CYCLE_DURATION;
      }

      let nextPhase: StoryPhase = "sitting";
      let alertBlend = 0;
      let grandpaAlpha = 1;

      if (elapsed < 3.0) {
        nextPhase = "sitting";
        if (grandpaRoot) {
          grandpaRoot.position.copy(SIT_POS);
          grandpaRoot.rotation.set(0, -0.34, 0);
        }
      } else if (elapsed < 5.2) {
        nextPhase = "standing";
        const u = THREE.MathUtils.smoothstep((elapsed - 3.0) / 2.2, 0, 1);
        if (grandpaRoot) {
          grandpaRoot.position.lerpVectors(SIT_POS, STAND_END_POS, u);
          grandpaRoot.rotation.set(0, THREE.MathUtils.lerp(-0.34, -1.16, u), 0);
        }
      } else if (elapsed < 11.4) {
        // Full slowed Tripping clip seamlessly covers both the gentle walk and the stumble/fall
        nextPhase = "falling";
        if (grandpaRoot) {
          grandpaRoot.position.copy(STAND_END_POS);
          grandpaRoot.rotation.set(0, -1.16, 0);
        }
        alertBlend = THREE.MathUtils.smoothstep((elapsed - 8.5) / 0.65, 0, 1);
      } else if (elapsed < 14.6) {
        nextPhase = "alert";
        alertBlend = 1;
        if (grandpaRoot) {
          grandpaRoot.position.copy(STAND_END_POS);
          grandpaRoot.rotation.set(0, -1.16, 0);
        }
      } else if (elapsed < 15.3) {
        // Fade out fallen Grandpa + red alert smoothly while still lying on the rug
        nextPhase = "alert";
        const u = THREE.MathUtils.smoothstep((elapsed - 14.6) / 0.7, 0, 1);
        grandpaAlpha = 1 - u;
        alertBlend = 1 - u;
        if (grandpaRoot) {
          grandpaRoot.position.copy(STAND_END_POS);
          grandpaRoot.rotation.set(0, -1.16, 0);
        }
      } else {
        // Already invisible -> teleport to armchair in sitting pose and fade back in cleanly
        nextPhase = "sitting";
        const u = THREE.MathUtils.smoothstep((elapsed - 15.3) / 0.9, 0, 1);
        grandpaAlpha = u;
        alertBlend = 0;
        if (grandpaRoot) {
          grandpaRoot.position.copy(SIT_POS);
          grandpaRoot.rotation.set(0, -0.34, 0);
        }
      }

      setGrandpaOpacity(grandpaAlpha);

      if (nextPhase !== lastPhase) {
        lastPhase = nextPhase;
        setPhase(nextPhase);
        if (nextPhase === "sitting") playClip("sitting", elapsed >= 15.3 ? 0 : 0.35);
        else if (nextPhase === "standing") playClip("standing", 0.25);
        else if (nextPhase === "falling") playClip("falling", 0.28);
      }

      if (mixer && !prefersReducedMotion && frozenTime === null) {
        mixer.update(dt);
      }
      if (grandpaRoot) {
        grandpaRoot.updateMatrixWorld(true);
      }

      // Compute LIVE world position of Grandpa's torso/hips so CCTV beam & pose bracket track him accurately
      if (hipsBone) {
        hipsBone.getWorldPosition(liveHipsPos);
      } else if (grandpaRoot) {
        liveHipsPos.copy(grandpaRoot.position).add(new THREE.Vector3(0, 0.75, 0));
      } else {
        liveHipsPos.set(SIT_POS.x, 0.75, SIT_POS.z);
      }

      const showAlert = alertBlend > 0.65;
      if (showAlert !== lastAlert) {
        lastAlert = showAlert;
        setAlertVisible(showAlert);
      }

      // Smoothly aim CCTV beam & shift color White -> Red
      cctvTarget.position.lerp(
        new THREE.Vector3(liveHipsPos.x, Math.max(0.22, liveHipsPos.y), liveHipsPos.z),
        frozenTime !== null ? 1 : 0.12,
      );
      beamMesh.lookAt(cctvTarget.position);

      tmpColor.lerpColors(WHITE_BEAM, RED_BEAM, alertBlend);
      cctvSpot.color.copy(tmpColor);
      const redPulse = alertBlend > 0.5 ? 0.05 * Math.sin(elapsed * 7.5) : 0;
      cctvSpot.intensity = THREE.MathUtils.lerp(2.1, 4.4, alertBlend) + redPulse * 8;
      const uColor = beamMat.uniforms["uColor"];
      if (uColor && uColor.value instanceof THREE.Color) {
        uColor.value.copy(tmpColor);
      }
      const uOpacity = beamMat.uniforms["uOpacity"];
      if (uOpacity) {
        uOpacity.value = THREE.MathUtils.lerp(0.24, 0.42, alertBlend) + redPulse;
      }

      ledMat.color.lerpColors(SAFE_LED, ALERT_LED, alertBlend);

      // Update projected screen coordinates for the pose-detection lock bracket when fallen
      if (showAlert) {
        projected.set(liveHipsPos.x, liveHipsPos.y + 0.08, liveHipsPos.z).project(camera);
        const w = container.clientWidth || 1440;
        const h = container.clientHeight || 860;
        setLockScreenPos({
          x: (projected.x * 0.5 + 0.5) * w,
          y: (-projected.y * 0.5 + 0.5) * h,
        });
      }

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      visibilityObserver?.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#f3f8f6] select-none"
      aria-label="Adegan 3D ruang keluarga Rumi dengan lansia duduk di kursi, berdiri berjalan dengan tongkat, terjatuh, lalu lampu CCTV berubah merah dan memunculkan notifikasi Fall Alert"
      role="img"
    >
      {/* WebGL 3D Canvas */}
      <div
        ref={containerRef}
        className={`h-full w-full transition-opacity duration-500 ${sceneReady ? "opacity-100" : "opacity-0"}`}
      />

      {/* Left soft daylight gradient wash so headline and CTAs remain crisp */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(247,251,249,0.97) 0%, rgba(247,251,249,0.90) 26%, rgba(247,251,249,0.38) 42%, rgba(247,251,249,0) 56%)",
        }}
      />

      {/* Subtle foreground out-of-focus leaves framing bottom corners (Reference Image 3 depth) */}
      <svg
        viewBox="0 0 1440 860"
        preserveAspectRatio="xMidYMax slice"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full opacity-85"
        aria-hidden="true"
      >
        <g style={{ filter: "blur(5px)" }}>
          <polygon points="-25,860 32,685 110,750 80,860" fill="#5e9655" />
          <polygon points="32,860 128,745 196,812 152,860" fill="#4c8245" />
          <polygon points="1225,860 1320,735 1425,795 1378,860" fill="#588e50" />
          <polygon points="1315,860 1408,685 1470,745 1445,860" fill="#467a3f" />
        </g>
      </svg>

      {/* Projected 3D Pose-Detection Lock Bracket around Grandpa on fall */}
      {alertVisible && lockScreenPos && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
          style={{ left: `${lockScreenPos.x}px`, top: `${lockScreenPos.y}px` }}
        >
          <div className="relative h-28 w-44">
            <span className="absolute left-0 top-0 h-5 w-5 border-l-[3px] border-t-[3px] border-[#d43d37]" />
            <span className="absolute right-0 top-0 h-5 w-5 border-r-[3px] border-t-[3px] border-[#d43d37]" />
            <span className="absolute bottom-0 left-0 h-5 w-5 border-b-[3px] border-l-[3px] border-[#d43d37]" />
            <span className="absolute bottom-0 right-0 h-5 w-5 border-b-[3px] border-r-[3px] border-[#d43d37]" />
            <span className="absolute inset-0 animate-pulse rounded-lg bg-[#ef4444]/10" />
          </div>
        </div>
      )}

      {/* Floating Rumi Fall Alert Card (pops in when CCTV light shifts red) */}
      <div
        role="status"
        aria-live="off"
        data-phase={phase}
        className={`pointer-events-auto absolute right-10 top-[26%] z-30 rounded-2xl border border-[#f2c6c3] bg-white/95 px-4 py-3 shadow-[0_18px_42px_-16px_#0a393450] backdrop-blur-sm transition-all duration-300 xl:right-16 ${
          alertVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-[#d43d37]" />
          <span className="font-display text-xs font-bold text-[#0a3934]">Rumi</span>
          <span className="rounded-full bg-[#fde8e8] px-2 py-0.5 text-[11px] font-bold text-[#b91c1c]">
            Fall Alert
          </span>
        </div>
        <p className="mt-1 text-sm font-bold text-[#0a3934]">Ruang keluarga, Kamera 01</p>
      </div>
    </div>
  );
}
