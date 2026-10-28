import { Camera, Incident, DetectionStatus } from "@/types/rumi";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/events";

export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Masks basic-auth passwords in camera URLs to prevent credential leakage in UI/DOM/logs.
 * Example: rtsp://admin:secret123@192.168.1.100:554/live -> rtsp://admin:••••••@192.168.1.100:554/live
 */
export function maskCameraUrl(url: string): string {
  if (!url) return "";
  return url.replace(/(:\/\/[^:]+:)([^@]+)(@)/, "$1••••••$3");
}

// ──────────────── CAMERA API ────────────────
export async function fetchCameras(isActive?: boolean): Promise<Camera[]> {
  const query = isActive !== undefined ? `?is_active=${isActive}` : "";
  const res = await fetch(`${API_BASE_URL}/api/cameras${query}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Gagal mengambil data kamera (${res.status})`);
  }
  return res.json();
}

export async function createCamera(data: {
  name: string;
  location: string;
  url: string;
  protocol: "HTTP" | "HTTPS" | "RTSP";
}): Promise<Camera> {
  const res = await fetch(`${API_BASE_URL}/api/cameras`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(
      errorBody?.detail || `Gagal menambahkan kamera (${res.status})`
    );
  }
  return res.json();
}

export async function deleteCamera(cameraId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/cameras/${cameraId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Gagal menghapus kamera (${res.status})`);
  }
}

// ──────────────── INCIDENT ALERTS API ────────────────
export interface FetchIncidentsFilter {
  unread_only?: boolean;
  camera_id?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export async function fetchIncidents(
  filter: FetchIncidentsFilter = {}
): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (filter.unread_only !== undefined) {
    params.set("unread_only", String(filter.unread_only));
  }
  if (filter.camera_id) params.set("camera_id", filter.camera_id);
  if (filter.location) params.set("location", filter.location);
  if (filter.start_date) params.set("start_date", filter.start_date);
  if (filter.end_date) params.set("end_date", filter.end_date);
  if (filter.limit) params.set("limit", String(filter.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/api/incident-alerts${query}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Gagal mengambil riwayat insiden (${res.status})`);
  }
  return res.json();
}

export async function markIncidentRead(incidentId: string): Promise<Incident> {
  const res = await fetch(
    `${API_BASE_URL}/api/incident-alerts/${incidentId}/read`,
    {
      method: "PATCH",
    }
  );
  if (!res.ok) {
    throw new Error(`Gagal menandai insiden dibaca (${res.status})`);
  }
  return res.json();
}

export async function markAllIncidentsRead(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/incident-alerts/mark-all-read`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Gagal menandai semua insiden dibaca (${res.status})`);
  }
}

export async function deleteIncident(incidentId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/incident-alerts/${incidentId}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) {
    throw new Error(`Gagal menghapus insiden (${res.status})`);
  }
}

export async function deleteAllIncidents(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/incident-alerts`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Gagal menghapus semua insiden (${res.status})`);
  }
}

// ──────────────── DETECTION CONTROL API ────────────────
export async function fetchDetectionStatus(): Promise<DetectionStatus> {
  const res = await fetch(`${API_BASE_URL}/api/detection/status`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Gagal mengambil status deteksi (${res.status})`);
  }
  return res.json();
}

export async function startDetection(): Promise<DetectionStatus> {
  const res = await fetch(`${API_BASE_URL}/api/detection/start`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Gagal memulai engine deteksi (${res.status})`);
  }
  return res.json();
}

export async function stopDetection(): Promise<DetectionStatus> {
  const res = await fetch(`${API_BASE_URL}/api/detection/stop`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Gagal menghentikan engine deteksi (${res.status})`);
  }
  return res.json();
}
