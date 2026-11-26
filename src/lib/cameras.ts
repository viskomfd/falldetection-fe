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
const DEVICE_ID_KEY = "rumi_client_device_id";
const DISABLED_DEVICE_CAMERAS_KEY = "rumi_disabled_device_cameras";

function readDisabledDeviceCameraIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISABLED_DEVICE_CAMERAS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? new Set(parsed.filter((item): item is string => typeof item === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

function setDeviceCameraManuallyDisabled(id: string, disabled: boolean): void {
  if (typeof window === "undefined") return;
  const set = readDisabledDeviceCameraIds();
  if (disabled) {
    set.add(id);
  } else {
    set.delete(id);
  }
  window.localStorage.setItem(DISABLED_DEVICE_CAMERAS_KEY, JSON.stringify(Array.from(set)));
}

export function getLocalDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `dev-${generateUuid()}`;
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export function getDeviceOwnerId(url: string): string | null {
  const trimmed = url.trim();
  const qIdx = trimmed.indexOf("?");
  if (qIdx === -1) return null;
  const params = new URLSearchParams(trimmed.slice(qIdx + 1));
  return params.get("owner")?.trim() || null;
}

export function isLocalOwnedDeviceCamera(url: string, cameraId?: string): boolean {
  if (!isDeviceCameraUrl(url)) return false;
  const owner = getDeviceOwnerId(url);
  if (owner) {
    return owner === getLocalDeviceId();
  }
  return cameraId ? cameraId.startsWith("device-") : true;
}

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
  const base = url.trim().split("?")[0]?.toLowerCase() ?? "";
  return base === "device://user" ? "user" : "environment";
}

export function normalizeCameraUrl(url: string) {
  const trimmedUrl = url.trim();
  if (isDeviceCameraUrl(trimmedUrl)) {
    const facing = getDeviceFacingMode(trimmedUrl);
    const owner = getDeviceOwnerId(trimmedUrl);
    return owner
      ? `device://${facing}?owner=${encodeURIComponent(owner)}`
      : `device://${facing}`;
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
  const legacyLocalDeviceCameras = readCachedCameras().filter((c) => c.id.startsWith("device-"));
  const manuallyDisabled = readDisabledDeviceCameraIds();
  try {
    const remoteCameras = await cameraApi.list();
    const formatted: SavedCamera[] = remoteCameras.map((c) => {
      const normalized = normalizeCameraUrl(c.url);
      const isOwnedDevice =
        c.protocol === "DEVICE" && isLocalOwnedDeviceCamera(normalized, c.id);
      const resolvedStatus: "online" | "offline" = isOwnedDevice
        ? manuallyDisabled.has(c.id)
          ? "offline"
          : "online"
        : c.status;
      return {
        id: c.id,
        name: c.name,
        location: c.location,
        url: normalized,
        protocol: c.protocol,
        status: resolvedStatus,
      };
    });
    const merged = [...formatted, ...legacyLocalDeviceCameras];
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
  const payloadUrl =
    protocol === "DEVICE"
      ? `device://${getDeviceFacingMode(normalizedUrl)}?owner=${encodeURIComponent(getDeviceOwnerId(normalizedUrl) || getLocalDeviceId())}`
      : normalizedUrl;

  try {
    const created = await cameraApi.create({
      name: camera.name,
      location: camera.location,
      url: payloadUrl,
    });
    const current = readCachedCameras();
    const formatted: SavedCamera = {
      id: created.id,
      name: created.name,
      location: created.location,
      url: normalizeCameraUrl(created.url),
      protocol: created.protocol,
      status: protocol === "DEVICE" ? "online" : created.status,
    };
    if (protocol === "DEVICE") {
      setDeviceCameraManuallyDisabled(created.id, false);
    }
    writeCachedCameras([...current, formatted]);
    return formatted;
  } catch (err) {
    console.warn("Could not save camera on backend, falling back locally:", err);
    const localCamera: SavedCamera = {
      id: protocol === "DEVICE" ? `device-${generateUuid()}` : generateUuid(),
      name: camera.name,
      location: camera.location,
      url: payloadUrl,
      protocol,
      status: "online",
    };
    writeCachedCameras([...readCachedCameras(), localCamera]);
    return localCamera;
  }
}

export async function updateCamera(
  id: string,
  data: { name?: string; location?: string; url?: string },
): Promise<SavedCamera | null> {
  const current = readCachedCameras();
  const target = current.find((c) => c.id === id);
  if (!target) return null;

  const rawUrl = data.url !== undefined ? normalizeCameraUrl(data.url) : target.url;
  const nextProtocol = getCameraProtocol(rawUrl);
  const normalizedUrl =
    nextProtocol === "DEVICE"
      ? `device://${getDeviceFacingMode(rawUrl)}?owner=${encodeURIComponent(getDeviceOwnerId(rawUrl) || getDeviceOwnerId(target.url) || getLocalDeviceId())}`
      : rawUrl;
  const isLocalOnly = id.startsWith("device-");

  if (isLocalOnly && nextProtocol === "DEVICE") {
    const updatedLocal: SavedCamera = {
      ...target,
      name: data.name ?? target.name,
      location: data.location ?? target.location,
      url: normalizedUrl,
      protocol: "DEVICE",
    };
    writeCachedCameras(current.map((c) => (c.id === id ? updatedLocal : c)));
    return updatedLocal;
  }

  if (isLocalOnly && nextProtocol !== "DEVICE") {
    const created = await cameraApi.create({
      name: data.name ?? target.name,
      location: data.location ?? target.location,
      url: normalizedUrl,
    });
    const formatted: SavedCamera = {
      id: created.id,
      name: created.name,
      location: created.location,
      url: normalizeCameraUrl(created.url),
      protocol: created.protocol,
      status: created.status,
    };
    writeCachedCameras(current.map((c) => (c.id === id ? formatted : c)));
    return formatted;
  }

  const payload: { name?: string; location?: string; url?: string } = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.location !== undefined) payload.location = data.location;
  if (data.url !== undefined) payload.url = normalizedUrl;

  const updatedRemote = await cameraApi.update(id, payload);
  const formatted: SavedCamera = {
    id: updatedRemote.id,
    name: updatedRemote.name,
    location: updatedRemote.location,
    url: normalizeCameraUrl(updatedRemote.url),
    protocol: updatedRemote.protocol,
    status: updatedRemote.status,
  };
  writeCachedCameras(current.map((c) => (c.id === id ? formatted : c)));
  return formatted;
}

export async function updateCameraStatus(
  id: string,
  status: "online" | "offline",
): Promise<SavedCamera | null> {
  const current = readCachedCameras();
  const target = current.find((c) => c.id === id);
  if (!target) return null;

  const isLocalOnly = id.startsWith("device-");
  const isOwnedDevice =
    target.protocol === "DEVICE" && isLocalOwnedDeviceCamera(target.url, target.id);
  if (isOwnedDevice) {
    setDeviceCameraManuallyDisabled(id, status === "offline");
  }

  let nextStatus = status;

  if (!isLocalOnly) {
    const updatedRemote = await cameraApi.updateStatus(id, status);
    nextStatus = updatedRemote.status || status;
  }

  const updatedCamera: SavedCamera = { ...target, status: nextStatus };
  writeCachedCameras(current.map((c) => (c.id === id ? updatedCamera : c)));
  return updatedCamera;
}

export async function removeCamera(id: string) {
  const current = readCachedCameras();
  const isLocalOnly = id.startsWith("device-");
  setDeviceCameraManuallyDisabled(id, false);

  if (!isLocalOnly) {
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
