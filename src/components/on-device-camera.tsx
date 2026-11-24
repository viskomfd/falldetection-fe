import {
  Camera,
  CameraOff,
  FileVideo,
  Loader2,
  RotateCcw,
  Siren,
  SwitchCamera,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { playFallAlarm } from "@/lib/alarm";
import { getUser, incidentApi } from "@/lib/api";
import type { DeviceFacingMode } from "@/lib/cameras";
import {
  drawPoseOverlay,
  OnDeviceFallDetector,
  type FallStatus,
} from "@/lib/on-device-yolo";

type SourceMode = "idle" | "webcam" | "video";

type OnDeviceCameraProps = {
  cameraId?: string | undefined;
  cameraName?: string | undefined;
  cameraLocation?: string | undefined;
  initialFacingMode?: DeviceFacingMode | undefined;
  autoStart?: boolean | undefined;
  className?: string | undefined;
};

export function OnDeviceCamera({
  cameraId,
  cameraName,
  cameraLocation,
  initialFacingMode = "environment",
  autoStart = true,
  className,
}: OnDeviceCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<OnDeviceFallDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const runIdRef = useRef(0);
  const videoUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<SourceMode>("idle");
  const [facingMode, setFacingMode] = useState<DeviceFacingMode>(initialFacingMode);
  const [loadingModel, setLoadingModel] = useState(false);
  const [status, setStatus] = useState<FallStatus>("NORMAL");
  const [inferenceMs, setInferenceMs] = useState<number>(0);
  const [personCount, setPersonCount] = useState<number>(0);
  const [fallCount, setFallCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function stopLoopAndMedia(invalidateRun = true) {
    if (invalidateRun) {
      runIdRef.current += 1;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    busyRef.current = false;
    setMode("idle");
    setStatus("NORMAL");
    setPersonCount(0);
    setInferenceMs(0);
  }

  async function recordOnDeviceFallIncident(
    video: HTMLVideoElement,
    overlayCanvas: HTMLCanvasElement,
    confidence: number,
  ) {
    try {
      const formData = new FormData();
      if (cameraId) formData.append("camera_id", cameraId);
      formData.append("camera_name", cameraName || "Kamera Device");
      formData.append("location", cameraLocation || "Perangkat Lokal");
      const user = getUser();
      if (user?.elderly_name) {
        formData.append("person_name", user.elderly_name);
      }
      formData.append("confidence", String(Number(confidence.toFixed(2))));
      formData.append("clip_duration", "0 dtk");

      // Composite 1-frame snapshot (video + pose overlay) only when a fall is confirmed
      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = video.videoWidth || overlayCanvas.width;
      snapCanvas.height = video.videoHeight || overlayCanvas.height;
      const snapCtx = snapCanvas.getContext("2d");
      if (snapCtx && snapCanvas.width > 0 && snapCanvas.height > 0) {
        snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
        snapCtx.drawImage(overlayCanvas, 0, 0, snapCanvas.width, snapCanvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          snapCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
        );
        if (blob) {
          formData.append("thumbnail", blob, "fall-snapshot.jpg");
        }
      }

      const created = await incidentApi.reportOnDeviceAlert(formData);

      // Rekam klip bukti 5 detik (video + overlay pose) secara non-blocking lalu unggah ke insiden
      if (created?.id && typeof MediaRecorder !== "undefined") {
        void recordAndUploadClip(created.id, video, overlayCanvas, 5000);
      }
    } catch (err) {
      console.warn("Gagal mencatat insiden kamera device ke Riwayat:", err);
    }
  }

  async function recordAndUploadClip(
    incidentId: string,
    video: HTMLVideoElement,
    overlayCanvas: HTMLCanvasElement,
    durationMs = 5000,
  ) {
    try {
      const srcW = video.videoWidth || overlayCanvas.width;
      const srcH = video.videoHeight || overlayCanvas.height;
      if (!srcW || !srcH) return;

      const scale = Math.min(1, 640 / srcW);
      const recCanvas = document.createElement("canvas");
      recCanvas.width = Math.max(2, Math.round(srcW * scale));
      recCanvas.height = Math.max(2, Math.round(srcH * scale));
      const recCtx = recCanvas.getContext("2d");
      if (!recCtx || typeof recCanvas.captureStream !== "function") return;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "";

      const stream = recCanvas.captureStream(15);
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 900_000 })
        : new MediaRecorder(stream);

      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const drawFrame = () => {
        if (video.readyState >= 2) {
          recCtx.drawImage(video, 0, 0, recCanvas.width, recCanvas.height);
          recCtx.drawImage(overlayCanvas, 0, 0, recCanvas.width, recCanvas.height);
        }
      };

      drawFrame();
      const timerId = window.setInterval(drawFrame, 66);
      const startedAt = Date.now();

      const blob = await new Promise<Blob | null>((resolve) => {
        recorder.onstop = () => {
          window.clearInterval(timerId);
          stream.getTracks().forEach((t) => t.stop());
          resolve(chunks.length > 0 ? new Blob(chunks, { type: mimeType || "video/webm" }) : null);
        };
        recorder.onerror = () => {
          window.clearInterval(timerId);
          stream.getTracks().forEach((t) => t.stop());
          resolve(null);
        };
        recorder.start(250);
        window.setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, durationMs);
      });

      if (!blob || blob.size < 1024) return;

      const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const clipForm = new FormData();
      clipForm.append("clip", blob, "fall-clip.webm");
      clipForm.append("clip_duration", `${secs} dtk`);
      await incidentApi.uploadIncidentClip(incidentId, clipForm);
    } catch (err) {
      console.warn("Gagal merekam/mengunggah klip kamera device:", err);
    }
  }

  async function ensureDetector(myRunId: number): Promise<OnDeviceFallDetector> {
    if (!detectorRef.current) {
      detectorRef.current = new OnDeviceFallDetector();
    }
    setLoadingModel(true);
    try {
      await detectorRef.current.init();
      return detectorRef.current;
    } finally {
      if (runIdRef.current === myRunId) {
        setLoadingModel(false);
      }
    }
  }

  function startDetectionLoop(detector: OnDeviceFallDetector, myRunId: number) {
    const tick = async () => {
      if (runIdRef.current !== myRunId) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      if (
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        !busyRef.current
      ) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        busyRef.current = true;
        try {
          const result = await detector.detect(video);
          if (runIdRef.current !== myRunId) return;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            drawPoseOverlay(ctx, canvas.width, canvas.height, result);
          }
          setStatus(result.status);
          setInferenceMs(result.inferenceMs);
          setPersonCount(result.detections.length);
          if (result.fallTriggered) {
            setFallCount((prev) => prev + 1);
            try {
              playFallAlarm();
            } catch {
              // ignore audio autoplay restrictions
            }

            const fallDet = result.detections.find((d) => d.status === "FALL DETECTED");
            const confidence = fallDet?.conf ?? result.detections[0]?.conf ?? 0.9;
            void recordOnDeviceFallIncident(video, canvas, confidence);
          }
        } catch (err) {
          console.warn("On-device inference error:", err);
        } finally {
          busyRef.current = false;
        }
      }

      if (runIdRef.current === myRunId) {
        rafRef.current = requestAnimationFrame(() => {
          void tick();
        });
      }
    };

    rafRef.current = requestAnimationFrame(() => {
      void tick();
    });
  }

  async function startWebcam(targetFacing: DeviceFacingMode = facingMode) {
    setErrorMsg(null);
    stopLoopAndMedia(true);
    const myRunId = runIdRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        "Browser tidak mendukung akses kamera (pastikan dibuka lewat HTTPS atau localhost).",
      );
      return;
    }

    try {
      const detector = await ensureDetector(myRunId);
      if (runIdRef.current !== myRunId) return;
      detector.resetSessionState();

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (runIdRef.current !== myRunId) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }
      if (runIdRef.current !== myRunId) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }
      setMode("webcam");
      startDetectionLoop(detector, myRunId);
    } catch (err) {
      if (runIdRef.current === myRunId) {
        stopLoopAndMedia(false);
        setLoadingModel(false);
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Gagal menyalakan kamera atau memuat model ONNX.",
        );
      }
    }
  }

  useEffect(() => {
    if (autoStart) {
      void startWebcam(initialFacingMode);
    }
    return () => {
      stopLoopAndMedia(true);
      void detectorRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFacingMode, autoStart]);

  async function handleSwitchCamera() {
    const nextFacing: DeviceFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    if (mode === "webcam") {
      await startWebcam(nextFacing);
    }
  }

  async function handleSelectVideo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg(null);
    stopLoopAndMedia(true);
    const myRunId = runIdRef.current;

    try {
      const detector = await ensureDetector(myRunId);
      if (runIdRef.current !== myRunId) return;
      detector.resetSessionState();

      const objectUrl = URL.createObjectURL(file);
      videoUrlRef.current = objectUrl;

      if (videoRef.current) {
        videoRef.current.src = objectUrl;
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }
      if (runIdRef.current !== myRunId) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setMode("video");
      startDetectionLoop(detector, myRunId);
    } catch (err) {
      if (runIdRef.current === myRunId) {
        stopLoopAndMedia(false);
        setLoadingModel(false);
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Gagal memutar file video atau memuat model ONNX.",
        );
      }
    }
  }

  function handleResetSession() {
    detectorRef.current?.resetSessionState();
    setFallCount(0);
    setStatus("NORMAL");
  }

  const statusBadgeClass =
    status === "FALL DETECTED"
      ? "bg-destructive text-destructive-foreground"
      : status === "SUSPECTED FALL"
        ? "bg-amber-500 text-white"
        : "bg-black/65 text-white";

  return (
    <div
      className={`camera-media relative aspect-video w-full overflow-hidden bg-black/90 ${className ?? ""}`}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => void handleSelectVideo(e)}
      />

      {mode === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-muted p-4 text-center">
          {loadingModel ? (
            <>
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-xs font-bold text-foreground">Menyiapkan kamera & model...</p>
            </>
          ) : errorMsg ? (
            <>
              <CameraOff className="size-7 text-destructive/80" />
              <p className="max-w-xs text-xs font-semibold text-destructive">{errorMsg}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => void startWebcam(facingMode)}
                >
                  <Camera className="size-3.5" />
                  Coba Lagi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileVideo className="size-3.5" />
                  Video Lokal
                </Button>
              </div>
            </>
          ) : (
            <>
              <Camera className="size-7 text-muted-foreground/60" />
              <p className="text-xs font-bold text-muted-foreground">Kamera Device Dijeda</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => void startWebcam(facingMode)}
                >
                  <Camera className="size-3.5" />
                  Mulai
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileVideo className="size-3.5" />
                  Video Lokal
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {mode !== "idle" && (
        <>
          <div className="pointer-events-none absolute left-3 top-11 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold backdrop-blur ${statusBadgeClass}`}
            >
              {status === "FALL DETECTED" && <Siren className="size-3" />}
              {status === "NORMAL" ? `${personCount} orang · ${inferenceMs} ms` : status}
            </span>
            {fallCount > 0 && (
              <span className="rounded-full bg-destructive/90 px-2 py-0.5 text-[11px] font-bold text-white">
                Alert: {fallCount}
              </span>
            )}
          </div>

          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
            {mode === "webcam" && (
              <button
                type="button"
                aria-label="Ganti kamera depan atau belakang"
                title="Ganti kamera depan / belakang"
                onClick={() => void handleSwitchCamera()}
                className="flex size-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition-colors hover:bg-black/80"
              >
                <SwitchCamera className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Tes dengan file video lokal"
              title="Tes video lokal"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition-colors hover:bg-black/80"
            >
              <FileVideo className="size-3.5" />
            </button>
            {fallCount > 0 && (
              <button
                type="button"
                aria-label="Reset alert sesi"
                title="Reset alert sesi"
                onClick={handleResetSession}
                className="flex size-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition-colors hover:bg-black/80"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Hentikan kamera device"
              title="Hentikan kamera"
              onClick={() => stopLoopAndMedia()}
              className="flex size-8 items-center justify-center rounded-full bg-destructive/90 text-white backdrop-blur transition-colors hover:bg-destructive"
            >
              <CameraOff className="size-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
