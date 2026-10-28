"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  Video as VideoIcon,
  History,
  Settings,
  LogOut,
  Bell,
  AlertTriangle,
  RotateCcw,
  Check,
  Eye,
  Trash2,
  Plus,
  Play,
  Square,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Radio,
  WifiOff,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Volume2,
  VolumeX,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { CameraStream } from "@/components/camera-stream";
import { Camera, Incident, WebSocketEvent, DetectionStatus } from "@/types/rumi";
import {
  fetchCameras,
  createCamera,
  deleteCamera,
  fetchIncidents,
  markIncidentRead,
  markAllIncidentsRead,
  deleteIncident,
  deleteAllIncidents,
  fetchDetectionStatus,
  startDetection,
  stopDetection,
  resolveMediaUrl,
  maskCameraUrl,
} from "@/lib/api";
import { useRumiWebSocket } from "@/lib/use-rumi-websocket";

// Sound alert synthesizer using Web Audio API (cross-browser, 0 dependencies)
function playAlarmTone() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio playback may be restricted before user interaction
  }
}

// Fallback demo cameras if backend is offline / empty
const DEFAULT_CAMERAS: Camera[] = [
  {
    id: "cam-demo-1",
    name: "Ruang Tamu",
    location: "Ruang Tamu - Lantai 1",
    url: "http://192.168.1.50:8080/video",
    protocol: "HTTP",
    status: "ONLINE",
    is_active: true,
    last_seen: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "cam-demo-2",
    name: "Garasi",
    location: "Garasi Luar",
    url: "rtsp://admin:******@192.168.1.53:554/stream1",
    protocol: "RTSP",
    status: "OFFLINE",
    is_active: false,
    last_seen: null,
    created_at: new Date().toISOString(),
  },
];

export default function RumiApp() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "kamera" | "riwayat" | "pengaturan"
  >("dashboard");

  // Core Data States
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    status: "stopped",
    pid: null,
  });

  // UI / Modal States
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isEngineLoading, setIsEngineLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null
  );
  const [isAddCameraOpen, setIsAddCameraOpen] = useState(false);
  const [activeBannerDismissed, setActiveBannerDismissed] = useState(false);

  // New Camera Form
  const [newCamName, setNewCamName] = useState("");
  const [newCamLocation, setNewCamLocation] = useState("");
  const [newCamProtocol, setNewCamProtocol] = useState<
    "HTTP" | "HTTPS" | "RTSP"
  >("HTTP");
  const [newCamUrl, setNewCamUrl] = useState("");
  const [addCameraError, setAddCameraError] = useState<string | null>(null);
  const [isAddingCamera, setIsAddingCamera] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    popupAlert: true,
    soundAlarm: true,
    companionNotify: true,
    dailySummary: false,
  });

  // History Filters
  const [filterPeriod, setFilterPeriod] = useState<
    "all" | "today" | "7days" | "30days"
  >("all");
  const [filterCameraId, setFilterCameraId] = useState<string>("all");

  // 1. Initial Data Fetching
  const loadAllData = useCallback(async () => {
    try {
      setIsLoadingData(true);

      // Fetch cameras
      const camerasRes = await fetchCameras().catch((err) => {
        console.warn("[Rumi] Backend cameras offline, using demo:", err);
        return DEFAULT_CAMERAS;
      });
      setCameras(camerasRes.length > 0 ? camerasRes : DEFAULT_CAMERAS);

      // Fetch incidents
      const incidentsRes = await fetchIncidents().catch((err) => {
        console.warn("[Rumi] Backend incidents offline:", err);
        return [] as Incident[];
      });
      setIncidents(incidentsRes);

      // Fetch detection status
      const statusRes = await fetchDetectionStatus().catch(() => ({
        status: "stopped" as const,
        pid: null,
      }));
      setDetectionStatus(statusRes);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 2. Real-time WebSocket Event Listener
  const handleWebSocketEvent = useCallback(
    (wsEvent: WebSocketEvent) => {
      console.log("[Rumi WS Event]", wsEvent);

      switch (wsEvent.event) {
        case "INCIDENT_DETECTED": {
          const newIncident = wsEvent.data;
          setIncidents((prev) => [
            newIncident,
            ...prev.filter((item) => item.id !== newIncident.id),
          ]);
          setActiveBannerDismissed(false);

          if (settings.soundAlarm) {
            playAlarmTone();
          }
          break;
        }

        case "CAMERA_STATUS_CHANGED": {
          const { camera_id, status, last_seen } = wsEvent.data;
          setCameras((prev) =>
            prev.map((cam) =>
              cam.id === camera_id ? { ...cam, status, last_seen } : cam
            )
          );
          break;
        }

        case "CAMERA_ADDED": {
          const newCam = wsEvent.data;
          setCameras((prev) => [
            ...prev.filter((cam) => cam.id !== newCam.id),
            newCam,
          ]);
          break;
        }

        case "CAMERA_DELETED": {
          const { camera_id } = wsEvent.data;
          setCameras((prev) => prev.filter((cam) => cam.id !== camera_id));
          break;
        }

        case "INCIDENT_READ": {
          const { incident_id } = wsEvent.data;
          setIncidents((prev) =>
            prev.map((item) =>
              item.id === incident_id ? { ...item, is_read: true } : item
            )
          );
          break;
        }

        case "INCIDENTS_ALL_READ": {
          setIncidents((prev) =>
            prev.map((item) => ({ ...item, is_read: true }))
          );
          break;
        }

        case "INCIDENTS_ALL_DELETED": {
          setIncidents([]);
          setSelectedIncident(null);
          break;
        }
      }
    },
    [settings.soundAlarm]
  );

  const { isConnected } = useRumiWebSocket({ onEvent: handleWebSocketEvent });

  // 3. Computed Metrics
  const unreadCount = useMemo(
    () => incidents.filter((item) => !item.is_read).length,
    [incidents]
  );

  const activeCamerasCount = useMemo(
    () => cameras.filter((cam) => cam.status === "ONLINE").length,
    [cameras]
  );

  const todayIncidentsCount = useMemo(() => {
    const today = new Date().toDateString();
    return incidents.filter(
      (item) => new Date(item.detected_at).toDateString() === today
    ).length;
  }, [incidents]);

  const latestIncident = useMemo(() => {
    return incidents.length > 0 ? incidents[0] : null;
  }, [incidents]);

  // 4. Handlers
  const handleToggleEngine = async () => {
    try {
      setIsEngineLoading(true);
      if (detectionStatus.status === "running") {
        const res = await stopDetection();
        setDetectionStatus(res);
      } else {
        const res = await startDetection();
        setDetectionStatus(res);
      }
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Gagal mengubah status deteksi backend."
      );
    } finally {
      setIsEngineLoading(false);
    }
  };

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddCameraError(null);

    if (!newCamName.trim() || !newCamUrl.trim()) {
      setAddCameraError("Nama kamera dan URL wajib diisi.");
      return;
    }

    try {
      setIsAddingCamera(true);
      const created = await createCamera({
        name: newCamName.trim(),
        location: newCamLocation.trim() || "Lokasi Umum",
        url: newCamUrl.trim(),
        protocol: newCamProtocol,
      });

      setCameras((prev) => [...prev, created]);
      setNewCamName("");
      setNewCamLocation("");
      setNewCamUrl("");
      setIsAddCameraOpen(false);
    } catch (err: unknown) {
      setAddCameraError(
        err instanceof Error ? err.message : "Gagal menambahkan kamera."
      );
    } finally {
      setIsAddingCamera(false);
    }
  };

  const handleDeleteCamera = async (camId: string, camName: string) => {
    if (!confirm(`Hapus kamera "${camName}"?`)) return;

    try {
      await deleteCamera(camId);
      setCameras((prev) => prev.filter((cam) => cam.id !== camId));
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Gagal menghapus kamera backend."
      );
    }
  };

  const handleOpenIncidentModal = async (incident: Incident) => {
    setSelectedIncident(incident);
    if (!incident.is_read) {
      try {
        await markIncidentRead(incident.id);
        setIncidents((prev) =>
          prev.map((item) =>
            item.id === incident.id ? { ...item, is_read: true } : item
          )
        );
      } catch (err) {
        console.warn("Failed to mark incident as read:", err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllIncidentsRead();
      setIncidents((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Gagal menandai semua insiden dibaca."
      );
    }
  };

  const handleDeleteIncident = async (incidentId: string) => {
    if (!confirm("Hapus rekaman insiden ini dari riwayat?")) return;

    try {
      await deleteIncident(incidentId);
      setIncidents((prev) => prev.filter((item) => item.id !== incidentId));
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(null);
      }
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Gagal menghapus insiden backend."
      );
    }
  };

  const handleDeleteAllIncidents = async () => {
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus SEMUA riwayat insiden dan bukti rekaman?"
      )
    ) {
      return;
    }

    try {
      await deleteAllIncidents();
      setIncidents([]);
      setSelectedIncident(null);
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Gagal menghapus semua riwayat insiden."
      );
    }
  };

  // Filtered Incidents for Riwayat tab
  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      // 1. Filter Period
      if (filterPeriod !== "all") {
        const itemTime = new Date(item.detected_at).getTime();
        const now = Date.now();
        if (
          filterPeriod === "today" &&
          new Date(item.detected_at).toDateString() !==
            new Date().toDateString()
        ) {
          return false;
        }
        if (
          filterPeriod === "7days" &&
          now - itemTime > 7 * 24 * 60 * 60 * 1000
        ) {
          return false;
        }
        if (
          filterPeriod === "30days" &&
          now - itemTime > 30 * 24 * 60 * 60 * 1000
        ) {
          return false;
        }
      }

      // 2. Filter Camera
      if (filterCameraId !== "all" && item.camera_id !== filterCameraId) {
        return false;
      }

      return true;
    });
  }, [incidents, filterPeriod, filterCameraId]);

  return (
    <div className="flex min-h-screen gap-5 p-4 md:p-6 bg-[#d8eee7] text-[#143229]">
      {/* ──────────────── SIDEBAR ──────────────── */}
      <aside className="card-shadow sticky top-5 flex h-[calc(100vh-2.5rem)] w-64 shrink-0 flex-col rounded-4xl bg-white p-5 border border-[#c4e3da]/60">
        <div className="px-2 pb-6 pt-1">
          <BrandLogo
            imageClassName="w-12 h-12"
            textClassName="text-2xl font-black text-[#115e51] tracking-tight"
          />
          <p className="mt-1 text-xs font-semibold text-[#115e51]/70">
            Sistem Deteksi Jatuh &amp; Monitoring CCTV
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "dashboard"
                ? "bg-[#115e51] text-white card-shadow"
                : "text-slate-600 hover:bg-[#e7f5f1] hover:text-[#115e51]"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("kamera")}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "kamera"
                ? "bg-[#115e51] text-white card-shadow"
                : "text-slate-600 hover:bg-[#e7f5f1] hover:text-[#115e51]"
            }`}
          >
            <VideoIcon className="w-5 h-5" />
            <span className="flex-1 text-left">Kamera</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
              {cameras.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("riwayat")}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "riwayat"
                ? "bg-[#115e51] text-white card-shadow"
                : "text-slate-600 hover:bg-[#e7f5f1] hover:text-[#115e51]"
            }`}
          >
            <History className="w-5 h-5" />
            <span className="flex-1 text-left">Riwayat</span>
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} insiden baru`}
                className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-white bg-rose-600 rounded-full shadow-sm animate-pulse"
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pengaturan")}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "pengaturan"
                ? "bg-[#115e51] text-white card-shadow"
                : "text-slate-600 hover:bg-[#e7f5f1] hover:text-[#115e51]"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Pengaturan</span>
          </button>
        </nav>

        {/* WebSocket Status Indicator */}
        <div className="mb-4 rounded-2xl bg-[#edf6f3] p-3 text-xs border border-[#cfe6de]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="font-bold text-slate-700">
              {isConnected ? "Server Terhubung" : "Server Terputus"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isConnected
              ? "Live events & stream aktif"
              : "Mencoba menyambung kembali..."}
          </p>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={() => alert("Sesi monitoring Anda tetap aktif.")}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </aside>

      {/* ──────────────── MAIN CONTENT ──────────────── */}
      <main className="flex min-w-0 flex-1 flex-col gap-5">
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 px-2 pt-1">
          <div>
            <h1 className="text-2xl font-black text-[#143229] tracking-tight">
              Selamat Siang, Pak Andi!
            </h1>
            <p className="text-xs font-semibold text-[#115e51]/80">
              Semua kamera dipantau secara real-time untuk keselamatan lansia
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadAllData}
              title="Refresh Data"
              className="p-2.5 bg-white text-slate-700 rounded-2xl border border-slate-200 card-shadow hover:bg-slate-50 transition"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`}
              />
            </button>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2.5 bg-white pl-2 pr-4 py-1.5 rounded-2xl border border-slate-200 card-shadow">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#115e51] text-xs font-bold text-white shadow-sm">
                AP
              </span>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  Andi Pratama
                </p>
                <p className="text-[10px] text-slate-500">Pendamping Utama</p>
              </div>
            </div>
          </div>
        </header>

        {/* ──────────────── TAB: DASHBOARD ──────────────── */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-5">
            {/* 1. Fall Alert Banner */}
            {latestIncident && !activeBannerDismissed && (
              <section className="card-shadow flex flex-wrap items-center gap-4 rounded-3xl border border-rose-200 bg-rose-50/90 p-4">
                <div className="relative h-16 w-28 overflow-hidden rounded-2xl bg-slate-900 border border-rose-300">
                  {latestIncident.snapshot_url ? (
                    <img
                      src={resolveMediaUrl(latestIncident.snapshot_url)}
                      alt="Snapshot Kejadian Jatuh"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-rose-500">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-sm">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      INSIDEN JATUH TERDETEKSI
                    </span>
                    <span className="text-xs font-semibold text-rose-700">
                      {latestIncident.location || latestIncident.camera_name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-rose-950 font-medium">
                    Sistem mendeteksi jatuh pada{" "}
                    <strong>
                      {new Date(latestIncident.detected_at).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" }
                      )}{" "}
                      WIB
                    </strong>{" "}
                    dengan tingkat keyakinan{" "}
                    <strong>
                      {(latestIncident.confidence * 100).toFixed(0)}%
                    </strong>
                    .
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenIncidentModal(latestIncident)}
                    className="rounded-2xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
                  >
                    Buka Bukti Klip
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveBannerDismissed(true)}
                    className="rounded-2xl border border-rose-300 hover:bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-800 transition"
                  >
                    Tutup
                  </button>
                </div>
              </section>
            )}

            {/* 2. Top Stats & Engine Control */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat 1: Engine Control */}
              <div className="card-shadow flex flex-col justify-between rounded-3xl bg-white p-5 border border-[#cfe6de]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Model Deteksi
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      detectionStatus.status === "running"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        detectionStatus.status === "running"
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-slate-400"
                      }`}
                    />
                    {detectionStatus.status === "running" ? "Aktif" : "Mati"}
                  </span>
                </div>

                <div className="my-3">
                  <p className="text-xl font-black text-slate-800">
                    {detectionStatus.status === "running"
                      ? "AI Sedang Berjalan"
                      : "AI Nonaktif"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {detectionStatus.pid
                      ? `PID: ${detectionStatus.pid} (YOLOv11-Pose)`
                      : "Engine siap diaktifkan"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleEngine}
                  disabled={isEngineLoading}
                  className={`w-full py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm ${
                    detectionStatus.status === "running"
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-[#115e51] hover:bg-[#0c473d] text-white"
                  }`}
                >
                  {isEngineLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : detectionStatus.status === "running" ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Hentikan Deteksi</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Mulai Deteksi</span>
                    </>
                  )}
                </button>
              </div>

              {/* Stat 2: Active Cameras */}
              <div className="card-shadow flex flex-col justify-between rounded-3xl bg-white p-5 border border-[#cfe6de]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Kamera Aktif
                  </span>
                  <VideoIcon className="w-5 h-5 text-[#115e51]" />
                </div>
                <div className="my-2">
                  <p className="text-3xl font-black text-slate-800">
                    {activeCamerasCount}
                    <span className="text-lg font-bold text-slate-400 ml-1">
                      / {cameras.length}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {cameras.length - activeCamerasCount} kamera offline atau
                    RTSP
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("kamera")}
                  className="text-xs font-bold text-[#115e51] hover:underline text-left"
                >
                  Kelola Kamera &rarr;
                </button>
              </div>

              {/* Stat 3: Today Incidents */}
              <div className="card-shadow flex flex-col justify-between rounded-3xl bg-white p-5 border border-[#cfe6de]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Insiden Hari Ini
                  </span>
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div className="my-2">
                  <p className="text-3xl font-black text-slate-800">
                    {todayIncidentsCount}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {unreadCount} belum ditinjau di tab Riwayat
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("riwayat")}
                  className="text-xs font-bold text-[#115e51] hover:underline text-left"
                >
                  Buka Riwayat &rarr;
                </button>
              </div>

              {/* Stat 4: System Latency */}
              <div className="card-shadow flex flex-col justify-between rounded-3xl bg-white p-5 border border-[#cfe6de]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Estimasi Latensi
                  </span>
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="my-2">
                  <p className="text-3xl font-black text-slate-800">~2.4 dtk</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Deteksi kejadian hingga alert dikirim
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl w-fit">
                  WebSocket Real-time Aktif
                </span>
              </div>
            </div>

            {/* 3. Multi-Camera Live Grid */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    Live Feed Monitoring
                  </h2>
                  <p className="text-xs text-slate-500">
                    Feed multi-kamera 16:9 dengan deteksi jatuh otomatis
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCameraOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#115e51] hover:bg-[#0c473d] px-4 py-2 text-xs font-bold text-white shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Kamera
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {cameras.map((cam) => (
                  <CameraStream
                    key={cam.id}
                    name={cam.name}
                    location={cam.location}
                    url={cam.url}
                    protocol={cam.protocol}
                    status={cam.status}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ──────────────── TAB: KAMERA ──────────────── */}
        {activeTab === "kamera" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Daftar Kamera CCTV &amp; IP
                </h2>
                <p className="text-xs text-slate-500">
                  Kelola sumber video HTTP/MJPEG (IP Webcam) dan RTSP yang
                  diproses model visi komputer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCameraOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#115e51] hover:bg-[#0c473d] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Tambah Kamera Baru
              </button>
            </div>

            {/* Camera Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {cameras.map((cam) => (
                <div
                  key={cam.id}
                  className="card-shadow flex flex-col rounded-3xl bg-white p-4 border border-[#cfe6de] overflow-hidden"
                >
                  {/* Stream preview */}
                  <CameraStream
                    name={cam.name}
                    location={cam.location}
                    url={cam.url}
                    protocol={cam.protocol}
                    status={cam.status}
                  />

                  {/* Camera details */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        {cam.name}
                      </h3>
                      <p className="text-xs text-slate-500">{cam.location}</p>
                      <p
                        className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-xs"
                        title="URL Kamera (kredensial disensor demi keamanan)"
                      >
                        {maskCameraUrl(cam.url)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                        {cam.protocol}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCamera(cam.id, cam.name)}
                        title="Hapus Kamera"
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──────────────── TAB: RIWAYAT ──────────────── */}
        {activeTab === "riwayat" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Riwayat Notifikasi Insiden Jatuh
                </h2>
                <p className="text-xs text-slate-500">
                  Bukti snapshot, stempel waktu, dan rekaman klip kejadian
                  (monitoring &amp; bukti forensik)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white border border-[#115e51]/30 hover:bg-[#e7f5f1] px-4 py-2 text-xs font-bold text-[#115e51] shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Tandai Semua Sudah Dibaca ({unreadCount})
                  </button>
                )}

                {incidents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllIncidents}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-400 px-4 py-2 text-xs font-bold text-rose-600 shadow-sm transition"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    Hapus Semua ({incidents.length})
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="card-shadow flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 border border-[#cfe6de]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-2">
                  <Filter className="w-3.5 h-3.5" /> Filter Waktu:
                </span>
                {(
                  [
                    ["all", "Semua Waktu"],
                    ["today", "Hari Ini"],
                    ["7days", "7 Hari Terakhir"],
                    ["30days", "30 Hari Terakhir"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilterPeriod(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filterPeriod === key
                        ? "bg-[#115e51] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Camera Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Kamera:</span>
                <select
                  value={filterCameraId}
                  onChange={(e) => setFilterCameraId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#115e51]"
                >
                  <option value="all">Semua Kamera</option>
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.location})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Incident Records Table / Cards */}
            {filteredIncidents.length === 0 ? (
              <div className="card-shadow flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center border border-[#cfe6de]">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                <h3 className="text-base font-bold text-slate-800">
                  Tidak Ada Insiden Jatuh
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Semua kondisi ruangan terpantau aman dan tidak ada deteksi
                  insiden yang memenuhi kriteria filter.
                </p>
              </div>
            ) : (
              <div className="card-shadow rounded-3xl bg-white border border-[#cfe6de] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-[#edf6f3] text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4">Bukti Snapshot</th>
                        <th className="py-3 px-4">Waktu Deteksi</th>
                        <th className="py-3 px-4">Kamera &amp; Lokasi</th>
                        <th className="py-3 px-4">Keyakinan</th>
                        <th className="py-3 px-4">Klip Video</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredIncidents.map((incident) => (
                        <tr
                          key={incident.id}
                          className={`hover:bg-[#f6faf8] transition ${
                            !incident.is_read ? "bg-rose-50/40" : ""
                          }`}
                        >
                          {/* Thumbnail */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleOpenIncidentModal(incident)}
                              className="relative h-12 w-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 group block"
                            >
                              {incident.snapshot_url ? (
                                <img
                                  src={resolveMediaUrl(incident.snapshot_url)}
                                  alt="Thumbnail"
                                  className="h-full w-full object-cover group-hover:scale-105 transition"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-400">
                                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                                </div>
                              )}
                              <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-4 h-4 text-white" />
                              </span>
                            </button>
                          </td>

                          {/* Time */}
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {new Date(incident.detected_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                            <div className="text-[11px] text-slate-500 font-normal">
                              {new Date(
                                incident.detected_at
                              ).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              WIB
                            </div>
                          </td>

                          {/* Camera & Location */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800">
                              {incident.camera_name || "Kamera CCTV"}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {incident.location}
                            </p>
                          </td>

                          {/* Confidence */}
                          <td className="py-3 px-4 font-extrabold text-slate-800">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 text-xs">
                              {(incident.confidence * 100).toFixed(0)}%
                            </span>
                          </td>

                          {/* Clip Duration */}
                          <td className="py-3 px-4 text-slate-600">
                            {incident.clip_url ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-[#115e51]">
                                <Play className="w-3.5 h-3.5 fill-current" />
                                {incident.clip_duration_seconds} dtk
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">
                                Hanya Snapshot
                              </span>
                            )}
                          </td>

                          {/* Read Status */}
                          <td className="py-3 px-4">
                            {!incident.is_read ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                                BARU
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">
                                Sudah Dilihat
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenIncidentModal(incident)
                                }
                                className="px-3 py-1.5 rounded-xl bg-[#115e51] hover:bg-[#0c473d] text-white text-xs font-bold transition shadow-sm"
                              >
                                Lihat Bukti
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteIncident(incident.id)
                                }
                                title="Hapus Insiden"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────────── TAB: PENGATURAN ──────────────── */}
        {activeTab === "pengaturan" && (
          <div className="flex flex-col gap-5 max-w-4xl">
            <div>
              <h2 className="text-xl font-black text-slate-800">
                Pengaturan Sistem Monitoring
              </h2>
              <p className="text-xs text-slate-500">
                Konfigurasi akun pendamping, preferensi alert, dan protokol
                video
              </p>
            </div>

            {/* Profile Card */}
            <div className="card-shadow rounded-3xl bg-white p-6 border border-[#cfe6de] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-2xl bg-[#115e51] text-white flex items-center justify-center font-black text-xl shadow-md">
                  AP
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Andi Pratama
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pendamping Utama Keluarga &bull; andi.pratama@email.com
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sesi Aktif
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert("Pengaturan profil berhasil disimpan.")}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
              >
                Edit Profil
              </button>
            </div>

            {/* Notification Preferences */}
            <div className="card-shadow rounded-3xl bg-white p-6 border border-[#cfe6de] space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm">
                Preferensi Notifikasi
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-800">Pop-up Alert</p>
                    <p className="text-slate-500 text-[11px]">
                      Tampilkan banner merah saat deteksi jatuh terjadi
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.popupAlert}
                    onChange={(e) =>
                      setSettings({ ...settings, popupAlert: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-[#115e51] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-800">Alarm Suara</p>
                    <p className="text-slate-500 text-[11px]">
                      Bunyikan sinyal audio otomatis ketika insiden terdeteksi
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundAlarm}
                    onChange={(e) =>
                      setSettings({ ...settings, soundAlarm: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-[#115e51] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-800">Push Notification</p>
                    <p className="text-slate-500 text-[11px]">
                      Kirimkan notifikasi ke perangkat pendamping lain
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.companionNotify}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        companionNotify: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded accent-[#115e51] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Protocol & Streaming Reference */}
            <div className="card-shadow rounded-3xl bg-white p-6 border border-[#cfe6de] space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm">
                Informasi Protokol &amp; Arsitektur Kamera
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#edf6f3] border border-[#cfe6de]">
                  <p className="font-bold text-[#115e51]">HTTP / MJPEG</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Didukung langsung di browser. Sangat cocok untuk aplikasi
                    Android IP Webcam pada port 8080.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <p className="font-bold text-amber-800">RTSP CCTV</p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Disimpan di database backend. Memerlukan gateway (WebRTC/HLS)
                    untuk streaming langsung ke browser.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="font-bold text-slate-800">H.264 MP4 Forensik</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Klip video insiden di-encode standar AVC1/yuv420p sehingga
                    dapat diputar instan tanpa plugin tambahan.
                  </p>
                </div>
              </div>
            </div>

            {/* Security & Privacy Notice */}
            <div className="card-shadow rounded-3xl bg-white p-6 border border-[#cfe6de] space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#115e51]" />
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Privasi &amp; Keamanan Sistem (Security Hardening)
                </h3>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li>
                  <strong>Masking Kredensial URL:</strong> Password dan token pada URL RTSP/HTTP disensor secara otomatis (<code>••••••</code>) agar tidak bocor pada UI atau inspect element.
                </li>
                <li>
                  <strong>Validasi Upload:</strong> Backend membatasi ukuran thumbnail maks. 10MB dan video maks. 60MB untuk mencegah storage exhaustion DoS.
                </li>
                <li>
                  <strong>Kebijakan CORS Ketat:</strong> Akses API backend dibatasi hanya ke origin terpercaya (localhost:3000, 5173, dsb).
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* ──────────────── MODAL: TAMBAH KAMERA ──────────────── */}
      {isAddCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-[#e7f5f1] text-[#115e51] rounded-xl">
                  <VideoIcon className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-slate-800 text-base">
                  Tambah Kamera Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCameraOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {addCameraError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {addCameraError}
              </div>
            )}

            <form onSubmit={handleAddCamera} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Kamera
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ruang Tamu"
                  value={newCamName}
                  onChange={(e) => setNewCamName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-[#115e51]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lokasi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lantai 1 - Dekat Tangga"
                  value={newCamLocation}
                  onChange={(e) => setNewCamLocation(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-[#115e51]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Protokol Stream
                </label>
                <select
                  value={newCamProtocol}
                  onChange={(e) =>
                    setNewCamProtocol(
                      e.target.value as "HTTP" | "HTTPS" | "RTSP"
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-[#115e51] font-semibold"
                >
                  <option value="HTTP">HTTP / MJPEG (IP Webcam Android)</option>
                  <option value="HTTPS">HTTPS Stream</option>
                  <option value="RTSP">RTSP (CCTV Kamera IP)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  URL Stream Kamera
                </label>
                <input
                  type="text"
                  placeholder="http://192.168.1.10:8080"
                  value={newCamUrl}
                  onChange={(e) => setNewCamUrl(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-[#115e51]"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Untuk IP Webcam Android, backend otomatis menormalisasi
                  akhiran <code>/video</code>.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddCameraOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingCamera}
                  className="px-5 py-2.5 rounded-2xl bg-[#115e51] hover:bg-[#0c473d] text-white font-bold transition shadow-sm flex items-center gap-2"
                >
                  {isAddingCamera && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Simpan Kamera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: DETAIL & VIDEO FORENSIK ──────────────── */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-slate-800 text-base">
                  Bukti Insiden Jatuh —{" "}
                  {selectedIncident.camera_name || selectedIncident.location}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Video Player or Snapshot */}
            <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
              {selectedIncident.clip_url ? (
                <video
                  controls
                  autoPlay
                  src={resolveMediaUrl(selectedIncident.clip_url)}
                  className="w-full h-full object-cover"
                >
                  Browser Anda tidak mendukung pemutaran video langsung.
                </video>
              ) : selectedIncident.snapshot_url ? (
                <img
                  src={resolveMediaUrl(selectedIncident.snapshot_url)}
                  alt="Snapshot Bukti"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
                  <p className="text-xs">Snapshot dari Model Komputer Vision</p>
                </div>
              )}
            </div>

            {/* Incident Details Grid */}
            <div className="grid grid-cols-2 gap-3 bg-[#edf6f3] p-4 rounded-2xl text-xs border border-[#cfe6de]">
              <div>
                <span className="text-slate-500 text-[10px] font-semibold">
                  Lokasi Kamera
                </span>
                <p className="font-bold text-slate-800">
                  {selectedIncident.location || "Ruang Tamu"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] font-semibold">
                  Tingkat Keyakinan (Confidence)
                </span>
                <p className="font-bold text-rose-700">
                  {(selectedIncident.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] font-semibold">
                  Waktu Kejadian
                </span>
                <p className="font-bold text-slate-800">
                  {new Date(selectedIncident.detected_at).toLocaleString(
                    "id-ID"
                  )}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] font-semibold">
                  Durasi Rekaman Klip
                </span>
                <p className="font-bold text-slate-800">
                  {selectedIncident.clip_duration_seconds
                    ? `${selectedIncident.clip_duration_seconds} detik`
                    : "Tidak ada klip video"}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => handleDeleteIncident(selectedIncident.id)}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
              >
                Hapus Insiden
              </button>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-5 py-2 rounded-2xl text-xs font-bold bg-[#115e51] hover:bg-[#0c473d] text-white transition shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
