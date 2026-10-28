"use client";

import { useEffect, useRef, useState } from "react";
import { Camera as CameraIcon, RefreshCw, VideoOff } from "lucide-react";
import { CameraFullscreenButton } from "./camera-fullscreen-button";

interface CameraStreamProps {
  name: string;
  location?: string;
  url: string;
  protocol: "HTTP" | "HTTPS" | "RTSP";
  status?: "ONLINE" | "OFFLINE";
  fallbackImage?: string | null;
  className?: string;
  showControls?: boolean;
}

export function CameraStream({
  name,
  location,
  url,
  protocol,
  status = "ONLINE",
  fallbackImage,
  className = "",
  showControls = true,
}: CameraStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const isRtsp = protocol === "RTSP" || url.startsWith("rtsp://");

  // Auto-retry offline HTTP stream every 5 seconds per PRD section 8.4
  useEffect(() => {
    if (!hasError || isRtsp) return;

    const timer = setTimeout(() => {
      setHasError(false);
      setRetryKey((prev) => prev + 1);
    }, 5000);

    return () => clearTimeout(timer);
  }, [hasError, isRtsp]);

  const isLive = !isRtsp && !hasError && status === "ONLINE";

  return (
    <div
      ref={containerRef}
      className={`group relative aspect-video w-full overflow-hidden rounded-3xl bg-slate-900 border border-slate-200/40 shadow-sm ${className}`}
    >
      {/* 1. RTSP Placeholder state */}
      {isRtsp ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-300">
          <CameraIcon className="w-10 h-10 mb-2 text-slate-400 stroke-1" />
          <p className="text-sm font-semibold text-white">{name}</p>
          <span className="text-[11px] text-slate-400 mt-1 max-w-xs">
            Sumber RTSP tersimpan. Browser membutuhkan media gateway (WebRTC/HLS) untuk memutar langsung.
          </span>
          <span className="mt-3 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Protokol RTSP
          </span>
        </div>
      ) : hasError || status === "OFFLINE" ? (
        /* 2. Offline / Error state with 5s retry */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-300 bg-slate-950/80">
          <VideoOff className="w-10 h-10 mb-2 text-rose-400 stroke-1" />
          <p className="text-sm font-bold text-white">Kamera Offline</p>
          <p className="text-xs text-slate-400 mt-0.5">{name}</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Mencoba tersambung ulang setiap 5 detik...</span>
          </div>
        </div>
      ) : (
        /* 3. Live HTTP/MJPEG stream or fallback image */
        <img
          key={retryKey}
          src={url || fallbackImage || ""}
          alt={`Feed kamera ${name}`}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      )}

      {/* Overlays: Header Badge & Location */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {isRtsp ? "RTSP" : "Offline"}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/50 text-white backdrop-blur-sm">
            {name}
          </span>
        </div>

        {showControls && (
          <div className="pointer-events-auto">
            <CameraFullscreenButton targetElement={containerRef.current} />
          </div>
        )}
      </div>

      {location && (
        <div className="absolute bottom-3 left-3 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/60 text-slate-200 backdrop-blur-sm">
            {location}
          </span>
        </div>
      )}
    </div>
  );
}
