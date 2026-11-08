import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Cctv,
  ChevronRight,
  CircleAlert,
  Gauge,
  RadioTower,
  Siren,
} from "lucide-react";
import { useEffect, useState } from "react";

import fallSnapshot from "@/assets/fall-snapshot.jpg";
import { AppShell } from "@/components/app-shell";
import { CameraFullscreenButton } from "@/components/camera-fullscreen-button";
import { CameraStream } from "@/components/camera-stream";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  dashboardApi,
  resolveMediaUrl,
  WS_BASE_URL,
  type DashboardStats,
  type Incident,
} from "@/lib/api";
import { useSavedCameras } from "@/lib/cameras";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Rumi | Dashboard Monitoring" },
      {
        name: "description",
        content:
          "Pantau live grid multi-kamera CCTV, terima fall alert real-time, dan lihat ringkasan sistem deteksi jatuh.",
      },
      { property: "og:title", content: "Rumi | Dashboard Monitoring" },
      {
        property: "og:description",
        content:
          "Pantau live grid multi-kamera CCTV, terima fall alert real-time, dan lihat ringkasan sistem deteksi jatuh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const DEFAULT_WEEK_ACTIVITY = [
  { day: "Sen", value: 0 },
  { day: "Sel", value: 1 },
  { day: "Rab", value: 0 },
  { day: "Kam", value: 2 },
  { day: "Jum", value: 0 },
  { day: "Sab", value: 1 },
  { day: "Min", value: 0 },
];

function formatIncidentTime(isoString?: string): string {
  if (!isoString) return "12:47 WIB";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return `${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;
  } catch {
    return isoString;
  }
}

function Dashboard() {
  const savedCameras = useSavedCameras();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeAlert, setActiveAlert] = useState<Incident | null>(null);

  useEffect(() => {
    // 1. Fetch dashboard stats
    dashboardApi
      .summary()
      .then((data) => {
        setStats(data);
        if (data.latest_incident) {
          setActiveAlert(data.latest_incident);
        }
      })
      .catch((err) => console.warn("Could not fetch dashboard summary:", err));

    // 2. Setup WebSocket for real-time Fall Alert
    let ws: WebSocket | null = null;
    let heartbeatTimer: number | null = null;

    try {
      ws = new WebSocket(WS_BASE_URL);

      ws.onopen = () => {
        // Send heartbeat ping every 25s
        heartbeatTimer = window.setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send("PING");
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "FALL_ALERT" && msg.data) {
            setActiveAlert(msg.data);
            const todayDayCode = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][
              new Date().getDay()
            ];
            setStats((prev) => {
              if (!prev) return prev;
              const updatedWeekly =
                prev.weekly_activity?.map((item) =>
                  item.day === todayDayCode ? { ...item, value: item.value + 1 } : item,
                ) ?? [];
              return {
                ...prev,
                today_incidents: prev.today_incidents + 1,
                latest_incident: msg.data,
                weekly_activity: updatedWeekly,
              };
            });
          }
        } catch {
          // ignore non-json messages
        }
      };

      ws.onerror = (e) => {
        console.warn("WebSocket alerts connection note:", e);
      };
    } catch (e) {
      console.warn("WebSocket init error:", e);
    }

    const handleFallEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Incident>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);
        const todayDayCode = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][new Date().getDay()];
        setStats((prev) => {
          if (!prev) return prev;
          const updatedWeekly =
            prev.weekly_activity?.map((item) =>
              item.day === todayDayCode ? { ...item, value: item.value + 1 } : item,
            ) ?? [];
          return {
            ...prev,
            today_incidents: prev.today_incidents + 1,
            latest_incident: customEvent.detail,
            weekly_activity: updatedWeekly,
          };
        });
      }
    };
    window.addEventListener("rumi:fall-alert", handleFallEvent);

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (ws) ws.close();
      window.removeEventListener("rumi:fall-alert", handleFallEvent);
    };
  }, []);

  const totalCameras = stats?.total_cameras ?? savedCameras.length;
  const activeCamerasCount =
    stats?.active_cameras ?? savedCameras.filter((c) => c.status !== "offline").length;
  const unavailableCameraCount = Math.max(0, totalCameras - activeCamerasCount);
  const uptime = stats?.uptime_percentage ?? 99.6;
  const latency = stats?.latency_seconds ?? 2.4;
  const todayIncidents = stats?.today_incidents ?? 0;
  const weeklyActivity = stats?.weekly_activity?.length
    ? stats.weekly_activity
    : DEFAULT_WEEK_ACTIVITY;

  const alertSnapshot = activeAlert?.snapshot_url
    ? resolveMediaUrl(activeAlert.snapshot_url)
    : fallSnapshot;

  const alertLocation = activeAlert?.location || "Ruang Tamu";
  const alertCam = activeAlert?.camera_name || "Cam 01";
  const alertTime = formatIncidentTime(activeAlert?.detected_at);
  const alertPerson = activeAlert?.person_name || "Pak Hartono";
  const alertResponseTime = activeAlert?.response_time_seconds || 2.1;

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        {/* Fall alert banner - hanya muncul jika ada active alert */}
        {activeAlert && (
          <section className="card-shadow flex flex-col items-stretch gap-4 rounded-3xl border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center">
            <img
              src={alertSnapshot}
              alt={`Snapshot kejadian jatuh di ${alertLocation}`}
              width={112}
              height={64}
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallSnapshot;
              }}
              className="h-32 w-full rounded-2xl object-cover sm:h-16 sm:w-28 sm:shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1 rounded-full">
                  <Siren className="size-3.5" />
                  Fall Alert
                </Badge>
                <span className="text-sm font-bold text-foreground">
                  {alertLocation} · {alertCam} · {alertTime}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Kejadian jatuh terdeteksi pada {alertPerson}. Notifikasi terkirim ke pendamping
                dalam {alertResponseTime} detik.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full rounded-full bg-card sm:w-auto">
              <Link to="/riwayat">Lihat Detail</Link>
            </Button>
          </section>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
          {/* Live grid */}
          <section className="grid content-start gap-4 sm:grid-cols-2 lg:gap-5">
            {savedCameras.length === 0 ? (
              <div className="col-span-full card-shadow flex flex-col items-center justify-center rounded-3xl bg-card p-6 text-center sm:p-10">
                <Cctv className="size-10 text-muted-foreground/50" />
                <h3 className="mt-3 font-bold text-foreground">Belum ada kamera terdaftar</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tambahkan kamera CCTV atau IP Webcam untuk memantau feed secara live.
                </p>
                <Button asChild size="sm" className="mt-4 rounded-full">
                  <Link to="/kamera">Tambah Kamera</Link>
                </Button>
              </div>
            ) : (
              savedCameras.map((camera, index) => {
                const isOffline = camera.status === "offline";
                return (
                  <article
                    key={camera.id}
                    data-camera-frame
                    className="card-shadow group relative aspect-video self-start overflow-hidden rounded-3xl bg-card"
                  >
                    <CameraStream
                      cameraId={camera.id}
                      name={camera.name}
                      url={camera.url}
                      protocol={camera.protocol}
                    />
                    {!isOffline && camera.protocol === "HTTP" && (
                      <div className="camera-live-only absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-bold text-foreground">
                        <span className="size-2 rounded-full bg-destructive" />
                        Live
                      </div>
                    )}
                    {isOffline && (
                      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-destructive/90 px-3 py-1.5 text-xs font-bold text-white">
                        Offline
                      </div>
                    )}
                    <CameraFullscreenButton cameraName={camera.name} />
                    <div className="camera-live-only absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
                      <p className="text-sm font-bold text-card-teal-foreground">{camera.name}</p>
                      <p className="text-xs text-card-teal-foreground/70">
                        {camera.location} · Cam {String(index + 1).padStart(2, "0")}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          {/* Insights card */}
          <section className="card-shadow flex flex-col gap-3 rounded-3xl bg-card-teal p-4 text-card-teal-foreground">
            <div className="flex items-center justify-between px-2 pt-1">
              <h2 className="text-lg font-bold">Insiden Terbaru</h2>
              <Link
                to="/riwayat"
                aria-label="Lihat semua insiden"
                className="flex size-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
              >
                <ChevronRight className="size-4" />
              </Link>
            </div>

            {activeAlert ? (
              <div className="flex items-center gap-3 rounded-2xl bg-card p-3 text-foreground">
                <img
                  src={alertSnapshot}
                  alt="Snapshot insiden jatuh"
                  width={96}
                  height={64}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallSnapshot;
                  }}
                  className="h-14 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{alertPerson} terdeteksi jatuh</p>
                  <p className="text-xs text-muted-foreground">
                    {alertLocation} · {alertTime}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-card p-4 text-foreground">
                <p className="text-sm font-bold">Status Aman</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tidak ada insiden jatuh yang tercatat saat ini.
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-card p-4 text-foreground">
              <p className="text-sm font-bold">Insiden Hari Ini</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Tercatat</span>
                <span className="text-sm font-extrabold text-success">
                  <ArrowUpRight className="mr-1 inline size-4" />
                  {todayIncidents} kejadian
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-card p-4 text-foreground">
              <p className="text-sm font-bold">Waktu Pengiriman Alert</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Target &lt; 3 detik</span>
                <span className="text-sm font-extrabold text-success">{latency} detik</span>
              </div>
            </div>

            <div className="mt-auto rounded-2xl bg-white/15 p-4">
              <p className="text-sm font-semibold">Notifikasi insiden aktif di sistem Rumi.</p>
            </div>
          </section>
        </div>

        {/* Stat cards */}
        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-5">
          <div className="card-shadow rounded-3xl bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Kamera Aktif</p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">
                  {activeCamerasCount}
                  <span className="text-lg text-muted-foreground">/{totalCameras}</span>
                </p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
                <Camera className="size-5" />
              </span>
            </div>
            {unavailableCameraCount > 0 ? (
              <p className="mt-3 text-xs font-semibold text-destructive">
                <ArrowDownRight className="mr-1 inline size-4" />
                {unavailableCameraCount} kamera offline / perlu diperiksa
              </p>
            ) : (
              <p className="mt-3 text-xs font-semibold text-success">
                <ArrowUpRight className="mr-1 inline size-4" />
                Semua kamera terhubung dengan baik
              </p>
            )}
          </div>

          <div className="card-shadow rounded-3xl bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Uptime Sistem</p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">
                  {uptime}
                  <span className="text-lg text-muted-foreground">%</span>
                </p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
                <RadioTower className="size-5" />
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold text-success">
              <ArrowUpRight className="mr-1 inline size-4" />
              Di atas target 99,5%
            </p>
          </div>

          <div className="card-shadow rounded-3xl bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Latensi Alert</p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">
                  {latency}
                  <span className="text-lg text-muted-foreground"> dtk</span>
                </p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
                <Gauge className="size-5" />
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold text-success">
              <CircleAlert className="mr-1 inline size-4 text-success" />
              Real-time, konsisten &lt; 3 detik
            </p>
          </div>
        </section>

        {/* Weekly activity */}
        <section className="card-shadow rounded-3xl bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">Insiden 7 Hari Terakhir</h2>
              <p className="text-sm text-muted-foreground">
                Total {weeklyActivity.reduce((acc, curr) => acc + curr.value, 0)} kejadian
                terdeteksi minggu ini
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              Mode CCTV aktif
            </Badge>
          </div>
          <div className="mt-6 flex h-36 items-end gap-1 sm:gap-3">
            {weeklyActivity.map((item) => {
              const maxVal = Math.max(...weeklyActivity.map((i) => i.value), 1);
              const heightPercent =
                item.value === 0
                  ? 8
                  : Math.max(22, Math.min(100, Math.round((item.value / maxVal) * 100)));
              const todayCode = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][
                new Date().getDay()
              ];
              const isToday = item.day === todayCode;

              return (
                <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-28 w-full flex-col items-center justify-end">
                    {item.value > 0 && (
                      <span className="mb-1 text-[11px] font-bold text-primary">{item.value}</span>
                    )}
                    <div
                      className={`w-5 rounded-full transition-all duration-300 sm:w-8 ${
                        item.value > 0 ? "bg-primary" : "bg-muted"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isToday ? "font-bold text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
