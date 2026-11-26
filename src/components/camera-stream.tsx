import { CameraOff, Cctv, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { OnDeviceCamera } from "@/components/on-device-camera";
import { API_BASE_URL } from "@/lib/api";
import {
  getDeviceFacingMode,
  normalizeCameraUrl,
  type CameraProtocol,
} from "@/lib/cameras";

type CameraStreamProps = {
  cameraId?: string;
  name: string;
  location?: string;
  url: string;
  protocol: CameraProtocol;
  status?: "online" | "offline" | undefined;
  className?: string;
};

export function CameraStream({
  cameraId,
  name,
  location,
  url,
  protocol,
  status = "online",
  className,
}: CameraStreamProps) {
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const isOffline = status === "offline";
  const isDeviceCamera = protocol === "DEVICE";

  // Alirkan seluruh kamera terdaftar via backend proxy agar diproses oleh model YOLO11
  // (menampilkan bounding box & pose skeleton)
  const isBackendStream = Boolean(cameraId) && !isDeviceCamera;
  const basePlaybackUrl = isBackendStream
    ? `${API_BASE_URL}/api/cameras/${cameraId}/stream`
    : normalizeCameraUrl(url);

  const playbackUrl =
    isBackendStream && reloadKey > 0
      ? `${basePlaybackUrl}?t=${reloadKey}`
      : basePlaybackUrl;

  // Tangani perpindahan tab browser: saat tab aktif kembali, segarkan koneksi stream
  // agar frame tidak freeze akibat browser men-throttle background tab
  useEffect(() => {
    if (isDeviceCamera || isOffline) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setReloadKey((prev) => prev + 1);
        setFailed(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isDeviceCamera, isOffline]);

  useEffect(() => {
    if (isDeviceCamera || isOffline || !failed) return;
    const retryTimer = window.setTimeout(() => setFailed(false), 4000);
    return () => window.clearTimeout(retryTimer);
  }, [isDeviceCamera, isOffline, failed, playbackUrl]);

  if (isOffline) {
    return (
      <div
        className={`camera-stream-offline flex aspect-video w-full flex-col items-center justify-center gap-2 bg-muted p-6 text-center ${className ?? ""}`}
      >
        <CameraOff className="size-8 text-muted-foreground/60" />
        <p className="text-sm font-bold text-muted-foreground">Kamera Dinonaktifkan</p>
        <p className="text-xs text-muted-foreground/70">
          {name} · aktifkan kembali untuk melanjutkan deteksi
        </p>
      </div>
    );
  }

  if (isDeviceCamera) {
    return (
      <OnDeviceCamera
        cameraId={cameraId}
        cameraName={name}
        cameraLocation={location}
        initialFacingMode={getDeviceFacingMode(url)}
        className={className}
      />
    );
  }

  if (failed) {
    return (
      <div
        className={`camera-stream-offline flex aspect-video w-full flex-col items-center justify-center gap-2 bg-muted p-6 text-center ${className ?? ""}`}
      >
        <Cctv className="size-8 text-muted-foreground/60" />
        <p className="text-sm font-bold text-muted-foreground">Kamera Offline</p>
        <p className="text-xs text-muted-foreground/70">
          {name} · mencoba tersambung ulang
        </p>
        <RefreshCw className="size-4 text-muted-foreground/60" />
      </div>
    );
  }

  return (
    <img
      key={reloadKey}
      src={playbackUrl}
      alt={`Live feed kamera ${name}`}
      className={`camera-media aspect-video w-full object-cover ${className ?? ""}`}
      onError={() => setFailed(true)}
    />
  );
}
