// Centralized API Client for Rumi Frontend

export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string) || "http://localhost:8000";
export const WS_BASE_URL =
  (import.meta.env["VITE_WS_URL"] as string) || "ws://localhost:8000/ws/alerts";

// ========================
// TYPES & INTERFACES
// ========================

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_initials: string;
  elderly_name?: string | null;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type CameraProtocol = "HTTP" | "RTSP";

export interface Camera {
  id: string;
  name: string;
  location: string;
  url: string;
  protocol: CameraProtocol;
  status: "online" | "offline";
  created_at?: string;
}

export interface Incident {
  id: string;
  camera_id?: string | null;
  camera_name: string;
  location: string;
  person_name: string;
  detected_at: string;
  confidence: number;
  snapshot_url?: string | null;
  clip_duration: string;
  response_time_seconds: number;
  status: string;
}

export interface WeeklyActivityItem {
  day: string;
  value: number;
}

export interface DashboardStats {
  active_cameras: number;
  total_cameras: number;
  uptime_percentage: number;
  latency_seconds: number;
  today_incidents: number;
  latest_incident?: Incident | null;
  weekly_activity: WeeklyActivityItem[];
}

// ========================
// TOKEN & SESSION HELPERS
// ========================

const TOKEN_KEY = "rumi_auth_token";
const USER_KEY = "rumi_auth_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function resolveMediaUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

// ========================
// CORE FETCH CLIENT
// ========================

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.detail) {
        errorMessage =
          typeof errorJson.detail === "string"
            ? errorJson.detail
            : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Keep default errorMessage
    }

    if (response.status === 401 && typeof window !== "undefined") {
      clearSession();
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// ========================
// API SERVICE MODULES
// ========================

export const authApi = {
  async register(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const res = await apiRequest<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setToken(res.access_token);
    setUser(res.user);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setToken(res.access_token);
    setUser(res.user);
    return res;
  },

  async getMe(): Promise<User> {
    const user = await apiRequest<User>("/api/auth/me");
    setUser(user);
    return user;
  },

  async updateProfile(data: {
    name?: string;
    email?: string;
    elderly_name?: string;
  }): Promise<User> {
    const user = await apiRequest<User>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setUser(user);
    return user;
  },

  async changePassword(data: { current_password: string; new_password: string }): Promise<void> {
    await apiRequest("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
    clearSession();
  },

  async logoutAll(): Promise<void> {
    await apiRequest("/api/auth/logout-all", { method: "POST" });
    clearSession();
  },

  logout(): void {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
};

export const cameraApi = {
  async list(): Promise<Camera[]> {
    return apiRequest<Camera[]>("/api/cameras");
  },

  async create(data: { name: string; location: string; url: string }): Promise<Camera> {
    return apiRequest<Camera>("/api/cameras", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async delete(cameraId: string): Promise<{ message: string; id: string }> {
    return apiRequest<{ message: string; id: string }>(`/api/cameras/${cameraId}`, {
      method: "DELETE",
    });
  },
};

export const incidentApi = {
  async list(params?: { days?: number | string; location?: string }): Promise<Incident[]> {
    const query = new URLSearchParams();
    if (params?.days && params.days !== "all") {
      query.set("days", String(params.days));
    }
    if (params?.location && params.location !== "all") {
      query.set("location", params.location);
    }
    const qs = query.toString();
    return apiRequest<Incident[]>(`/api/incidents${qs ? `?${qs}` : ""}`);
  },

  async create(incident: Partial<Incident>): Promise<Incident> {
    return apiRequest<Incident>("/api/incidents", {
      method: "POST",
      body: JSON.stringify(incident),
    });
  },
};

export const dashboardApi = {
  async summary(): Promise<DashboardStats> {
    return apiRequest<DashboardStats>("/api/dashboard/summary");
  },
};

export const modelApi = {
  async status(): Promise<{
    model_file: string;
    is_model_loaded: boolean;
    mode: string;
    thresholds?: Record<string, number>;
    message: string;
  }> {
    return apiRequest("/api/model/status");
  },

  async simulateFall(): Promise<unknown> {
    return apiRequest("/api/model/simulate-fall", {
      method: "POST",
    });
  },
};
