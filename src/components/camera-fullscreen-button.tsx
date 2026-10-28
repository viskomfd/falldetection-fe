"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

interface CameraFullscreenButtonProps {
  targetElement: HTMLElement | null;
  className?: string;
}

export function CameraFullscreenButton({
  targetElement,
  className = "p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm transition",
}: CameraFullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (targetElement) {
        await targetElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request error:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className={className}
      aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
      title={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
    >
      {isFullscreen ? (
        <Minimize2 className="w-4 h-4 text-white" />
      ) : (
        <Maximize2 className="w-4 h-4 text-white" />
      )}
    </button>
  );
}
