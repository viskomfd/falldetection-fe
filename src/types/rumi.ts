export interface Camera {
  id: string;
  name: string;
  location: string;
  url: string;
  protocol: "HTTP" | "HTTPS" | "RTSP";
  status: "ONLINE" | "OFFLINE";
  is_active: boolean;
  last_seen: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  camera_id: string;
  camera_name: string;
  location: string;
  confidence: number;
  detected_at: string; // ISO 8601 string
  snapshot_url: string; // e.g. "/storage/thumbnails/thumb_...jpg"
  clip_url: string | null; // e.g. "/storage/clips/clip_...mp4" (H.264 browser playable)
  clip_duration_seconds: number;
  is_read: boolean;
}

export type WebSocketEvent =
  | { event: "INCIDENT_DETECTED"; data: Incident }
  | {
      event: "CAMERA_STATUS_CHANGED";
      data: {
        camera_id: string;
        status: "ONLINE" | "OFFLINE";
        last_seen: string | null;
      };
    }
  | { event: "CAMERA_ADDED"; data: Camera }
  | { event: "CAMERA_DELETED"; data: { camera_id: string } }
  | { event: "INCIDENT_READ"; data: { incident_id: string } }
  | { event: "INCIDENTS_ALL_READ"; data: Record<string, never> }
  | { event: "INCIDENTS_ALL_DELETED"; data: Record<string, never> };

export interface DetectionStatus {
  status: "running" | "stopped";
  pid: number | null;
  message?: string;
}
