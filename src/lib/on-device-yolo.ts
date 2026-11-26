// On-device YOLO11-Pose inference & RUMI Temporal Fall Detection Engine (ONNX Runtime Web)
// Runs 100% locally in the user's browser — zero video frames leave the device.

export const MODEL_INPUT_SIZE = 640;
export const DEFAULT_MODEL_URL = "/models/yolo11_rumi.onnx";

// Calibrated 4D Grid Search & Temporal Validation Parameters (synced with RUMI Colab v3 & Backend)
const ASPECT_RATIO_THRESHOLD = 0.85;
const TORSO_ANGLE_THRESHOLD = 45.0;
const VERTICAL_VELOCITY_THRESHOLD = 13.0; // baseline 480p px/step
const FLOOR_COLLAPSE_THRESHOLD = 0.42;
const SLOW_FALL_DROP_THRESHOLD = 45.0; // baseline 480p px
const INACTIVITY_MS = 1200;
const POSTURE_WINDOW = 5;
const POSTURE_VOTE_RATIO = 0.4;
const TRACK_TTL_MS = 3000;

// COCO 17-keypoint indices
const L_SHOULDER = 5;
const R_SHOULDER = 6;
const L_HIP = 11;
const R_HIP = 12;
const L_KNEE = 13;
const R_KNEE = 14;
const L_ANKLE = 15;
const R_ANKLE = 16;

export type FallStatus = "NORMAL" | "SUSPECTED FALL" | "FALL DETECTED";

export interface Keypoint {
  x: number;
  y: number;
  conf: number;
}

export interface PoseDetection {
  box: [number, number, number, number]; // [x1, y1, x2, y2] in source video pixels
  conf: number;
  keypoints: Keypoint[]; // 17 COCO keypoints
  aspectRatio: number;
  torsoAngle: number;
  status: FallStatus;
}

export interface FrameInferenceResult {
  detections: PoseDetection[];
  status: FallStatus;
  fallTriggered: boolean;
  inferenceMs: number;
  backend: string;
}

// COCO 17-keypoint skeleton pairs
const SKELETON_EDGES: Array<[number, number]> = [
  [0, 1], [0, 2], [1, 3], [2, 4], // head
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // arms
  [5, 11], [6, 12], [11, 12], // torso
  [11, 13], [13, 15], [12, 14], [14, 16], // legs
];

type OrtModule = typeof import("onnxruntime-web");
type OrtSession = import("onnxruntime-web").InferenceSession;

interface SharedOrtRuntime {
  ort: OrtModule;
  session: OrtSession;
  backend: string;
  inputName: string;
  outputName: string;
  inputSize: number;
}

const sharedRuntimePromises = new Map<string, Promise<SharedOrtRuntime>>();
let sharedRunQueue: Promise<unknown> = Promise.resolve();

function enqueueOrtRun<T>(task: () => Promise<T>): Promise<T> {
  const next = sharedRunQueue.then(task, task);
  sharedRunQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function getSharedOrtRuntime(modelUrl: string): Promise<SharedOrtRuntime> {
  const existing = sharedRuntimePromises.get(modelUrl);
  if (existing) return existing;

  const promise = (async (): Promise<SharedOrtRuntime> => {
    const ort = await import("onnxruntime-web");

    // Load WASM runtime from jsDelivr matching installed onnxruntime-web@1.31.1
    // Avoids Vite dev-server blocking dynamic import() of .mjs files inside /public
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
    ort.env.wasm.numThreads = 1; // Single-thread WASM works everywhere without COOP/COEP headers

    // Try WebGPU first on supported browsers, fallback cleanly to WASM
    const providers: Array<"webgpu" | "wasm"> =
      typeof navigator !== "undefined" && "gpu" in navigator
        ? ["webgpu", "wasm"]
        : ["wasm"];

    let session: OrtSession | null = null;
    let activeBackend = "wasm";
    let lastErr: unknown = null;

    for (const ep of providers) {
      try {
        session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: [ep],
          graphOptimizationLevel: "all",
        });
        activeBackend = ep;
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!session) {
      sharedRuntimePromises.delete(modelUrl);
      throw new Error(
        `Gagal memuat model ONNX: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
      );
    }

    const inputName = session.inputNames[0] || "images";
    const outputName = session.outputNames[0] || "output0";

    // Auto-detect static model input size (supports both 320x320 and 640x640 ONNX exports seamlessly)
    let inputSize = MODEL_INPUT_SIZE;
    const meta = session.inputMetadata?.[0];
    if (meta && meta.isTensor && Array.isArray(meta.shape)) {
      const hDim = meta.shape[2];
      if (typeof hDim === "number" && hDim >= 160 && hDim <= 1280) {
        inputSize = hDim;
      }
    }

    return { ort, session, backend: activeBackend, inputName, outputName, inputSize };
  })();

  sharedRuntimePromises.set(modelUrl, promise);
  return promise;
}

interface Point2D {
  x: number;
  y: number;
}

class BrowserPersonTracker {
  id: number;
  hipYHistory: number[] = [];
  boxYHistory: number[] = [];
  postureFlags: boolean[] = [];
  lastCenter: Point2D | null = null;
  lastSeenMs = 0;
  maxUprightHeight = 0;
  hasBeenUpright = false;
  lastFallMotionMs = 0;
  suspectGraceUntilMs = 0;
  fallSuspectedSinceMs: number | null = null;
  fallConfirmedLatch = false;

  private readonly historyLen = 20;

  constructor(id: number, nowMs: number) {
    this.id = id;
    this.lastSeenMs = nowMs;
  }

  isInactive(box: [number, number, number, number], moveThresh: number): boolean {
    if (!this.lastCenter) return true;
    const c = getBoxCenter(box);
    return Math.hypot(c.x - this.lastCenter.x, c.y - this.lastCenter.y) < moveThresh;
  }

  updateState(box: [number, number, number, number], hipPos: Point2D | null, nowMs: number): void {
    const c = getBoxCenter(box);
    this.boxYHistory.push(c.y);
    if (this.boxYHistory.length > this.historyLen) this.boxYHistory.shift();

    if (hipPos) {
      this.hipYHistory.push(hipPos.y);
      if (this.hipYHistory.length > this.historyLen) this.hipYHistory.shift();
    }

    this.lastCenter = c;
    this.lastSeenMs = nowMs;
  }

  verticalVelocity(): number {
    if (this.hipYHistory.length >= 2) {
      const n = this.hipYHistory.length;
      const instant = this.hipYHistory[n - 1]! - this.hipYHistory[n - 2]!;
      const avg = (this.hipYHistory[n - 1]! - this.hipYHistory[0]!) / Math.max(1, n - 1);
      return Math.max(instant, avg);
    }
    if (this.boxYHistory.length >= 2) {
      const n = this.boxYHistory.length;
      const instant = this.boxYHistory[n - 1]! - this.boxYHistory[n - 2]!;
      const avg = (this.boxYHistory[n - 1]! - this.boxYHistory[0]!) / Math.max(1, n - 1);
      return Math.max(instant, avg);
    }
    return 0;
  }

  totalVerticalDrop(): number {
    const dropHip =
      this.hipYHistory.length >= 3
        ? this.hipYHistory[this.hipYHistory.length - 1]! - Math.min(...this.hipYHistory)
        : 0;
    const dropBox =
      this.boxYHistory.length >= 3
        ? this.boxYHistory[this.boxYHistory.length - 1]! - Math.min(...this.boxYHistory)
        : 0;
    return Math.max(dropHip, dropBox);
  }

  votePosture(flag: boolean): boolean {
    this.postureFlags.push(flag);
    if (this.postureFlags.length > POSTURE_WINDOW) this.postureFlags.shift();
    if (this.postureFlags.length < 2) return flag;
    const trueCount = this.postureFlags.reduce((acc, v) => acc + (v ? 1 : 0), 0);
    return trueCount / this.postureFlags.length >= POSTURE_VOTE_RATIO;
  }
}

export class OnDeviceFallDetector {
  private ort: OrtModule | null = null;
  private session: OrtSession | null = null;
  private inputName = "images";
  private outputName = "output0";
  private inputSize = MODEL_INPUT_SIZE;
  private activeBackend = "wasm";

  // Offscreen canvas for letterbox preprocessing
  private prepCanvas: HTMLCanvasElement | null = null;
  private prepCtx: CanvasRenderingContext2D | null = null;

  // Spatial multi-person trackers & room-level fall continuity
  private trackers: Map<number, BrowserPersonTracker> = new Map();
  private nextTrackId = 1;
  private roomLastUprightMs = 0;
  private roomLastMotionMs = 0;
  private lastAlertAt = 0;
  private readonly alertCooldownMs = 10000;

  async init(modelUrl: string = DEFAULT_MODEL_URL): Promise<string> {
    if (this.session) return this.activeBackend;

    const runtime = await getSharedOrtRuntime(modelUrl);
    this.ort = runtime.ort;
    this.session = runtime.session;
    this.activeBackend = runtime.backend;
    this.inputName = runtime.inputName;
    this.outputName = runtime.outputName;
    this.inputSize = runtime.inputSize;

    if (typeof document !== "undefined") {
      this.prepCanvas = document.createElement("canvas");
      this.prepCanvas.width = this.inputSize;
      this.prepCanvas.height = this.inputSize;
      this.prepCtx = this.prepCanvas.getContext("2d", { willReadFrequently: true });
    }

    return this.activeBackend;
  }

  resetSessionState(): void {
    this.trackers.clear();
    this.nextTrackId = 1;
    this.roomLastUprightMs = 0;
    this.roomLastMotionMs = 0;
    this.lastAlertAt = 0;
  }

  async dispose(): Promise<void> {
    // Shared InferenceSession stays alive for other camera cards / remounts
    this.session = null;
    this.resetSessionState();
  }

  async detect(
    source: HTMLVideoElement | HTMLCanvasElement,
    confThreshold = 0.45
  ): Promise<FrameInferenceResult> {
    if (!this.session || !this.ort || !this.prepCtx) {
      throw new Error("Detector belum diinisialisasi.");
    }

    const srcW = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const srcH = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
    if (!srcW || !srcH) {
      return {
        detections: [],
        status: "NORMAL",
        fallTriggered: false,
        inferenceMs: 0,
        backend: this.activeBackend,
      };
    }

    const t0 = performance.now();
    const inputSize = this.inputSize;

    // 1. Letterbox resize into inputSize x inputSize
    const scale = Math.min(inputSize / srcW, inputSize / srcH);
    const newW = Math.round(srcW * scale);
    const newH = Math.round(srcH * scale);
    const padX = Math.floor((inputSize - newW) / 2);
    const padY = Math.floor((inputSize - newH) / 2);

    this.prepCtx.fillStyle = "rgb(114, 114, 114)";
    this.prepCtx.fillRect(0, 0, inputSize, inputSize);
    this.prepCtx.drawImage(source, 0, 0, srcW, srcH, padX, padY, newW, newH);

    const imgData = this.prepCtx.getImageData(0, 0, inputSize, inputSize).data;
    const area = inputSize * inputSize;
    const tensorData = new Float32Array(3 * area);

    for (let i = 0; i < area; i++) {
      const p = i * 4;
      tensorData[i] = (imgData[p] ?? 0) / 255.0; // R
      tensorData[area + i] = (imgData[p + 1] ?? 0) / 255.0; // G
      tensorData[2 * area + i] = (imgData[p + 2] ?? 0) / 255.0; // B
    }

    const inputTensor = new this.ort.Tensor("float32", tensorData, [
      1,
      3,
      inputSize,
      inputSize,
    ]);

    // 2. Run ONNX inference (serialized across cards for single-threaded WASM safety)
    const session = this.session;
    const inputName = this.inputName;
    const outputs = await enqueueOrtRun(() => session.run({ [inputName]: inputTensor }));
    const outputTensor = outputs[this.outputName];
    if (!outputTensor) {
      return {
        detections: [],
        status: "NORMAL",
        fallTriggered: false,
        inferenceMs: Math.round(performance.now() - t0),
        backend: this.activeBackend,
      };
    }
    const data = outputTensor.data as Float32Array;
    const dims = outputTensor.dims; // [1, 56, N]

    // 3. Parse YOLO11-pose output [1, 56, N]
    const numChannels = dims[1] ?? 0;
    const numAnchors = dims[2] ?? 0;
    const candidates: Array<{
      box: [number, number, number, number];
      conf: number;
      keypoints: Keypoint[];
    }> = [];

    for (let a = 0; a < numAnchors; a++) {
      const conf = data[4 * numAnchors + a] ?? 0;
      if (conf < confThreshold) continue;

      const cx = data[0 * numAnchors + a] ?? 0;
      const cy = data[1 * numAnchors + a] ?? 0;
      const w = data[2 * numAnchors + a] ?? 0;
      const h = data[3 * numAnchors + a] ?? 0;

      const x1 = Math.max(0, Math.min(srcW, (cx - w / 2 - padX) / scale));
      const y1 = Math.max(0, Math.min(srcH, (cy - h / 2 - padY) / scale));
      const x2 = Math.max(0, Math.min(srcW, (cx + w / 2 - padX) / scale));
      const y2 = Math.max(0, Math.min(srcH, (cy + h / 2 - padY) / scale));

      // Ignore degenerate tiny boxes
      if (x2 - x1 < 20 || y2 - y1 < 20) continue;

      const keypoints: Keypoint[] = [];
      const kpCount = Math.min(17, Math.floor((numChannels - 5) / 3));
      for (let k = 0; k < kpCount; k++) {
        const base = (5 + k * 3) * numAnchors + a;
        const kx = ((data[base] ?? 0) - padX) / scale;
        const ky = ((data[base + numAnchors] ?? 0) - padY) / scale;
        const kc = data[base + 2 * numAnchors] ?? 0;
        keypoints.push({ x: kx, y: ky, conf: kc });
      }

      candidates.push({ box: [x1, y1, x2, y2], conf, keypoints });
    }

    // 4. NMS
    const kept = nonMaxSuppression(candidates, 0.45);

    // 5. RUMI 4D Kinematic + Temporal State Machine (with Close-Up & Sitting Guards)
    const now = Date.now();
    const frameScale = srcH / 480.0;
    const velThresh = VERTICAL_VELOCITY_THRESHOLD * frameScale;
    const dropThresh = SLOW_FALL_DROP_THRESHOLD * frameScale;
    const inactThresh = 25.0 * frameScale;
    const matchRadius = 160.0 * frameScale;

    const matchedIds = new Set<number>();
    let overallStatus: FallStatus = "NORMAL";
    let fallTriggered = false;

    const detections: PoseDetection[] = kept.map((item) => {
      const box = item.box;
      const center = getBoxCenter(box);
      const bw = Math.max(1, box[2] - box[0]);
      const bh = Math.max(1, box[3] - box[1]);
      const aspectRatio = bw / bh;
      const floorCollapseRatio = box[1] / (srcH + 1e-6);

      // Spatial nearest-neighbor matching to existing trackers
      let tracker: BrowserPersonTracker | null = null;
      let bestDist = matchRadius;
      for (const [tid, cand] of this.trackers.entries()) {
        if (matchedIds.has(tid)) continue;
        if (now - cand.lastSeenMs > TRACK_TTL_MS || !cand.lastCenter) continue;
        const d = Math.hypot(center.x - cand.lastCenter.x, center.y - cand.lastCenter.y);
        if (d < bestDist) {
          bestDist = d;
          tracker = cand;
        }
      }
      if (!tracker) {
        tracker = new BrowserPersonTracker(this.nextTrackId++, now);
        this.trackers.set(tracker.id, tracker);
      }
      matchedIds.add(tracker.id);

      const shMid = getValidPoint(item.keypoints, L_SHOULDER, R_SHOULDER, 0.30);
      let hMid = getValidPoint(item.keypoints, L_HIP, R_HIP, 0.35);
      if (hMid && hMid.y > srcH * 0.96) {
        hMid = null;
      }
      const kneePos = getValidPoint(item.keypoints, L_KNEE, R_KNEE, 0.25);
      const anklePos = getValidPoint(item.keypoints, L_ANKLE, R_ANKLE, 0.25);

      const hasValidTorso = Boolean(shMid && hMid);
      const torsoAngle = shMid && hMid ? calcTorsoAngle(shMid, hMid) : 0;
      const torsoLen = shMid && hMid ? Math.hypot(hMid.x - shMid.x, hMid.y - shMid.y) : 0;

      // Close-Up / Upper-Body Webcam Guard:
      // Rejects head-and-shoulders webcam framing or compressed face-hallucinated skeletons
      const isCloseupUpperBody =
        (shMid !== null &&
          hMid === null &&
          kneePos === null &&
          anklePos === null &&
          floorCollapseRatio < 0.45) ||
        (hasValidTorso &&
          torsoLen < bh * 0.14 &&
          floorCollapseRatio < 0.45 &&
          aspectRatio < 0.95);

      const inactive = tracker.isInactive(box, inactThresh);
      tracker.updateState(box, hMid, now);
      const vVel = tracker.verticalVelocity();
      const totalDrop = tracker.totalVerticalDrop();

      // Guard Duduk Tegak (Seated Upright)
      const isSeatedUpright =
        hasValidTorso &&
        torsoAngle < 24.0 &&
        hMid!.y - shMid!.y > bh * 0.14 &&
        (tracker.maxUprightHeight === 0 || bh >= tracker.maxUprightHeight * 0.62) &&
        aspectRatio < 0.80;

      // 1. Perspektif Lantai (Longitudinal Fall)
      const isLongitudinalFloor =
        box[3] > srcH * 0.68 &&
        floorCollapseRatio > FLOOR_COLLAPSE_THRESHOLD &&
        bh < srcH * 0.52 &&
        !isSeatedUpright &&
        !isCloseupUpperBody;

      // 2. Hukum Anatomi Berdiri Tegak / Duduk Normal
      let isUpright = isCloseupUpperBody || isSeatedUpright;
      if (!isLongitudinalFloor && hasValidTorso && !isUpright) {
        const shAboveHip = hMid!.y - shMid!.y > bh * 0.12;
        let hipAboveLower = true;
        if (anklePos) {
          hipAboveLower = anklePos.y - hMid!.y > bh * 0.12;
        } else if (kneePos) {
          hipAboveLower = kneePos.y - hMid!.y > bh * 0.08;
        }
        if (shAboveHip && hipAboveLower) {
          if ((torsoAngle < 32.0 && aspectRatio < 0.60) || (aspectRatio < 0.75 && torsoAngle < 38.0)) {
            isUpright = true;
          }
        }
      }

      // 3. Deteksi Lonjakan Kinetika Jatuh
      const hasKineticDrop =
        vVel > velThresh ||
        totalDrop > dropThresh ||
        (tracker.maxUprightHeight > 0 && bh < tracker.maxUprightHeight * 0.58);

      if (hasKineticDrop && tracker.hasBeenUpright && !isUpright) {
        tracker.lastFallMotionMs = now;
        tracker.suspectGraceUntilMs = now + 3500;
        this.roomLastMotionMs = now;
      }

      const recentDrop = now - tracker.lastFallMotionMs <= 4000;
      const inGracePeriod = now < tracker.suspectGraceUntilMs;
      const roomRecentFall =
        now - this.roomLastMotionMs <= 4000 && now - this.roomLastUprightMs <= 8000;
      const hasFallDynamics = recentDrop || inGracePeriod || roomRecentFall;

      // 4. Identifikasi Postur Rebah di Lantai
      let isFloorPosture = false;
      if (isLongitudinalFloor) {
        isFloorPosture = true;
      } else if (!isUpright && !isCloseupUpperBody) {
        if (hasValidTorso && shMid!.y >= hMid!.y - 8) {
          isFloorPosture = true;
        } else if (hasValidTorso && torsoAngle > TORSO_ANGLE_THRESHOLD) {
          isFloorPosture = true;
        } else if (aspectRatio > ASPECT_RATIO_THRESHOLD) {
          isFloorPosture = true;
        }
      }

      // 5. Keputusan State Machine (Event-Based, NOT Static Posture)
      let rawFlag = false;
      if (isUpright) {
        tracker.hasBeenUpright = true;
        if (bh > tracker.maxUprightHeight && !isCloseupUpperBody) {
          tracker.maxUprightHeight = bh;
        }
        this.roomLastUprightMs = now;
        tracker.fallConfirmedLatch = false;
        tracker.fallSuspectedSinceMs = null;
        tracker.suspectGraceUntilMs = 0;
        tracker.postureFlags = [];
        rawFlag = false;
      } else if (tracker.fallConfirmedLatch) {
        rawFlag = true;
      } else if (isFloorPosture && hasFallDynamics) {
        rawFlag = true;
      }

      const votedFall = tracker.votePosture(rawFlag);
      let detStatus: FallStatus = "NORMAL";

      if (votedFall) {
        detStatus = "SUSPECTED FALL";
        if (tracker.fallSuspectedSinceMs === null) {
          tracker.fallSuspectedSinceMs = now;
        }
        const elapsed = now - tracker.fallSuspectedSinceMs;
        if ((elapsed >= INACTIVITY_MS && inactive) || tracker.fallConfirmedLatch) {
          detStatus = "FALL DETECTED";
          tracker.fallConfirmedLatch = true;
          overallStatus = "FALL DETECTED";
          if (now - this.lastAlertAt >= this.alertCooldownMs) {
            this.lastAlertAt = now;
            fallTriggered = true;
          }
        } else if (overallStatus === "NORMAL") {
          overallStatus = "SUSPECTED FALL";
        }
      } else if (!tracker.fallConfirmedLatch) {
        tracker.fallSuspectedSinceMs = null;
      }

      return {
        ...item,
        aspectRatio,
        torsoAngle,
        status: detStatus,
      };
    });

    // Prune stale trackers
    for (const [tid, tr] of this.trackers.entries()) {
      if (!matchedIds.has(tid) && now - tr.lastSeenMs > TRACK_TTL_MS) {
        this.trackers.delete(tid);
      }
    }

    return {
      detections,
      status: overallStatus,
      fallTriggered,
      inferenceMs: Math.round(performance.now() - t0),
      backend: this.activeBackend,
    };
  }
}

function getBoxCenter(box: [number, number, number, number]): Point2D {
  return { x: (box[0] + box[2]) / 2, y: (box[1] + box[3]) / 2 };
}

function getValidPoint(
  kpts: Keypoint[],
  idx1: number,
  idx2: number,
  confThresh: number
): Point2D | null {
  const k1 = kpts[idx1];
  const k2 = kpts[idx2];
  const v1 = Boolean(k1 && k1.conf > confThresh);
  const v2 = Boolean(k2 && k2.conf > confThresh);
  if (v1 && v2) {
    return { x: (k1!.x + k2!.x) / 2, y: (k1!.y + k2!.y) / 2 };
  }
  if (v1) return { x: k1!.x, y: k1!.y };
  if (v2) return { x: k2!.x, y: k2!.y };
  return null;
}

function calcTorsoAngle(shMid: Point2D, hMid: Point2D): number {
  const dx = Math.abs(hMid.x - shMid.x);
  const dy = Math.abs(hMid.y - shMid.y);
  return (Math.atan2(dx, Math.max(dy, 1e-5)) * 180) / Math.PI;
}

function iou(
  a: [number, number, number, number],
  b: [number, number, number, number]
): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (inter <= 0) return 0;
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  return inter / (areaA + areaB - inter + 1e-6);
}

function nonMaxSuppression<T extends { box: [number, number, number, number]; conf: number }>(
  items: T[],
  iouThreshold: number
): T[] {
  const sorted = [...items].sort((a, b) => b.conf - a.conf);
  const kept: T[] = [];
  for (const cand of sorted) {
    if (kept.every((k) => iou(k.box, cand.box) < iouThreshold)) {
      kept.push(cand);
    }
  }
  return kept;
}

export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  result: FrameInferenceResult
): void {
  ctx.clearRect(0, 0, width, height);

  if (result.status === "FALL DETECTED") {
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);
  }

  for (const det of result.detections) {
    const [x1, y1, x2, y2] = det.box;
    const color =
      det.status === "FALL DETECTED"
        ? "#ef4444"
        : det.status === "SUSPECTED FALL"
          ? "#f59e0b"
          : "#22c55e";

    // Bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // Skeleton edges
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    for (const [a, b] of SKELETON_EDGES) {
      const ka = det.keypoints[a];
      const kb = det.keypoints[b];
      if (ka && kb && ka.conf > 0.35 && kb.conf > 0.35) {
        ctx.beginPath();
        ctx.moveTo(ka.x, ka.y);
        ctx.lineTo(kb.x, kb.y);
        ctx.stroke();
      }
    }

    // Keypoints
    ctx.fillStyle = "#facc15";
    for (const kp of det.keypoints) {
      if (kp.conf > 0.35) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Label
    const label = `${det.status} ${(det.conf * 100).toFixed(0)}% · ${Math.round(det.torsoAngle)}°`;
    ctx.font = "bold 13px sans-serif";
    const textW = ctx.measureText(label).width;
    const labelY = Math.max(22, y1 - 6);
    ctx.fillStyle = color;
    ctx.fillRect(x1, labelY - 16, textW + 12, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x1 + 6, labelY - 2);
  }
}
