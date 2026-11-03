import { Cctv, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { normalizeCameraUrl, type CameraProtocol } from "@/lib/cameras";

type CameraStreamProps = {
  cameraId?: string;
  name: string;
  url: string;
  protocol: CameraProtocol;
  className?: string;
};

export function CameraStream({
  cameraId,
  name,
  url,
  protocol,
  className,
}: CameraStreamProps) {
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Jika protokol RTSP, alirkan melalui proxy gateway backend (/api/cameras/{id}/stream)
  // agar browser dapat memutar frame video langsung via tag <img> tanpa perlu plugin tambahan
  const basePlaybackUrl =
    protocol === "RTSP" && cameraId
      ? `${API_BASE_URL}/api/cameras/${cameraId}/stream`
      : normalizeCameraUrl(url);

  const playbackUrl =
    protocol === "RTSP" && reloadKey > 0
      ? `${basePlaybackUrl}?t=${reloadKey}`
      : basePlaybackUrl;

  // Tangani perpindahan tab browser: saat tab aktif kembali, segarkan koneksi stream
  // agar frame tidak freeze akibat browser men-throttle background tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setReloadKey((prev) => prev + 1);
        setFailed(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!failed) return;
    const retryTimer = window.setTimeout(() => setFailed(false), 4000);
    return () => window.clearTimeout(retryTimer);
  }, [failed, playbackUrl]);

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
