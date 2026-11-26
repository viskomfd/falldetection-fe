import { CameraOff, Cctv, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { OnDeviceCamera } from "@/components/on-device-camera";
import { API_BASE_URL } from "@/lib/api";
import {
  getDeviceFacingMode,
  isLocalOwnedDeviceCamera,
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
  onStatusChange?: ((status: "online" | "offline") => void) | undefined;
  className?: string;
};

export function CameraStream({
  cameraId,
  name,
  location,
  url,
  protocol,
  status = "online",
  onStatusChange,
  className,
}: CameraStreamProps) {
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const isOffline = status === "offline";
  const isDeviceCamera = protocol === "DEVICE";
  const isLocalDeviceOwner = isDeviceCamera && isLocalOwnedDeviceCamera(url, cameraId);
  const isRemoteDeviceViewer = isDeviceCamera && !isLocalDeviceOwner;

  // Alirkan kamera CCTV & kamera device milik perangkat lain via backend MJPEG stream
  const isBackendStream = Boolean(cameraId) && !isLocalDeviceOwner;
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
    if (isLocalDeviceOwner || isOffline) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setReloadKey((prev) => prev + 1);
        setFailed(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isLocalDeviceOwner, isOffline]);

  useEffect(() => {
    if (isLocalDeviceOwner || isOffline || !failed) return;
    const retryTimer = window.setTimeout(() => {
      setReloadKey((prev) => prev + 1);
      setFailed(false);
    }, 4500);
    return () => window.clearTimeout(retryTimer);
  }, [isLocalDeviceOwner, isOffline, failed, playbackUrl]);

  if (isOffline) {
    return (
      <div
        className={`camera-stream-offline flex aspect-video w-full flex-col items-center justify-center gap-2 bg-muted p-6 text-center ${className ?? ""}`}
      >
        <CameraOff className="size-8 text-muted-foreground/60" />
        <p className="text-sm font-bold text-muted-foreground">
          {isRemoteDeviceViewer
            ? "Kamera Perangkat Offline"
            : isDeviceCamera
              ? "Kamera Dinonaktifkan"
              : "Kamera Offline"}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {isRemoteDeviceViewer
            ? `${name} · Menunggu siaran dari perangkat pemilik`
            : isDeviceCamera
              ? `${name} · aktifkan kembali untuk melanjutkan deteksi`
              : `${name} · stream terputus atau dinonaktifkan`}
        </p>
      </div>
    );
  }

  if (isLocalDeviceOwner) {
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
        <p className="text-sm font-bold text-muted-foreground">
          {isRemoteDeviceViewer ? "Kamera Perangkat Offline" : "Kamera Offline"}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {isRemoteDeviceViewer
            ? `${name} · Menunggu siaran dari perangkat pemilik`
            : `${name} · mencoba tersambung ulang`}
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
      onLoad={() => {
        setFailed(false);
        onStatusChange?.("online");
      }}
      onError={() => {
        setFailed(true);
        onStatusChange?.("offline");
      }}
    />
  );
}
