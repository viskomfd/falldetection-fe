import { useEffect, useState } from "react";
import { cameraApi, getUser, type CameraProtocol } from "@/lib/api";

export type { CameraProtocol };

export type DeviceFacingMode = "environment" | "user";

export type SavedCamera = {
  id: string;
  name: string;
  location: string;
  url: string;
  protocol: CameraProtocol;
  status?: "online" | "offline";
};

const CAMERAS_CHANGED_EVENT = "rumi:cameras-changed";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getStorageKey(): string {
  const user = getUser();
  return user?.id ? `rumi-cameras_${user.id}` : "rumi-cameras_guest";
}

export function isDeviceCameraUrl(url: string): boolean {
  return /^device:\/\//i.test(url.trim());
}

export function getDeviceFacingMode(url: string): DeviceFacingMode {
  return url.trim().toLowerCase() === "device://user" ? "user" : "environment";
}

export function normalizeCameraUrl(url: string) {
  const trimmedUrl = url.trim();
  if (isDeviceCameraUrl(trimmedUrl)) {
    return trimmedUrl.toLowerCase() === "device://user"
      ? "device://user"
      : "device://environment";
  }
  if (!/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.pathname === "/") parsedUrl.pathname = "/video";
    return parsedUrl.toString();
  } catch {
    return trimmedUrl;
  }
}

export function getCameraProtocol(url: string): CameraProtocol {
  if (isDeviceCameraUrl(url)) return "DEVICE";
  if (/^rtsp:\/\//i.test(url)) return "RTSP";
  return "HTTP";
}

function readCachedCameras(): SavedCamera[] {
  if (typeof window === "undefined") return [];
  try {
    // Clean legacy shared storage
    if (window.localStorage.getItem("rumi-cameras")) {
      window.localStorage.removeItem("rumi-cameras");
    }
    const key = getStorageKey();
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as SavedCamera[]) : [];
  } catch {
    return [];
  }
}

function writeCachedCameras(cameras: SavedCamera[]) {
  if (typeof window === "undefined") return;
  const key = getStorageKey();
  window.localStorage.setItem(key, JSON.stringify(cameras));
  window.dispatchEvent(new Event(CAMERAS_CHANGED_EVENT));
}

export async function fetchCameras(): Promise<SavedCamera[]> {
  const localDeviceCameras = readCachedCameras().filter((c) => c.protocol === "DEVICE");
  try {
    const remoteCameras = await cameraApi.list();
    const formatted: SavedCamera[] = remoteCameras.map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      url: normalizeCameraUrl(c.url),
      protocol: c.protocol,
      status: c.status,
    }));
    const merged = [...formatted, ...localDeviceCameras];
    writeCachedCameras(merged);
    return merged;
  } catch (err) {
    console.warn("Using cached cameras due to fetch error:", err);
    return readCachedCameras();
  }
}

export async function addCamera(camera: { name: string; location: string; url: string }) {
  const normalizedUrl = normalizeCameraUrl(camera.url);
  const protocol = getCameraProtocol(normalizedUrl);

  if (protocol === "DEVICE") {
    const deviceCamera: SavedCamera = {
      id: `device-${generateUuid()}`,
      name: camera.name,
      location: camera.location,
      url: normalizedUrl,
      protocol: "DEVICE",
      status: "online",
    };
    writeCachedCameras([...readCachedCameras(), deviceCamera]);
    return deviceCamera;
  }

  try {
    const created = await cameraApi.create({
      name: camera.name,
      location: camera.location,
      url: normalizedUrl,
    });
    const current = readCachedCameras();
    const updated = [
      ...current,
      {
        id: created.id,
        name: created.name,
        location: created.location,
        url: normalizeCameraUrl(created.url),
        protocol: created.protocol,
        status: created.status,
      },
    ];
    writeCachedCameras(updated);
    return created;
  } catch (err) {
    // Fallback locally
    const localCamera: SavedCamera = {
      id: generateUuid(),
      name: camera.name,
      location: camera.location,
      url: normalizedUrl,
      protocol,
      status: "online",
    };
    writeCachedCameras([...readCachedCameras(), localCamera]);
    return localCamera;
  }
}

export async function updateCameraStatus(
  id: string,
  status: "online" | "offline",
): Promise<SavedCamera | null> {
  const current = readCachedCameras();
  const target = current.find((c) => c.id === id);
  if (!target) return null;

  const isLocalDevice = id.startsWith("device-") || target.protocol === "DEVICE";
  let nextStatus = status;

  if (!isLocalDevice) {
    const updatedRemote = await cameraApi.updateStatus(id, status);
    nextStatus = updatedRemote.status || status;
  }

  const updatedCamera: SavedCamera = { ...target, status: nextStatus };
  writeCachedCameras(current.map((c) => (c.id === id ? updatedCamera : c)));
  return updatedCamera;
}

export async function removeCamera(id: string) {
  const current = readCachedCameras();
  const target = current.find((c) => c.id === id);
  const isLocalDevice = id.startsWith("device-") || target?.protocol === "DEVICE";

  if (!isLocalDevice) {
    try {
      await cameraApi.delete(id);
    } catch (err) {
      console.warn("Could not delete camera on backend, removing locally:", err);
    }
  }
  writeCachedCameras(current.filter((c) => c.id !== id));
}

export function useSavedCameras() {
  const [cameras, setCameras] = useState<SavedCamera[]>(() => readCachedCameras());

  useEffect(() => {
    // Initial fetch from backend
    void fetchCameras().then((res) => {
      setCameras(res);
    });

    const sync = () => setCameras(readCachedCameras());
    window.addEventListener(CAMERAS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(CAMERAS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return cameras;
}
