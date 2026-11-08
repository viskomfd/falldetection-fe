import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Cctv,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  Siren,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { playFallAlarm, showDesktopNotification } from "@/lib/alarm";
import { authApi, getUser, WS_BASE_URL, type Incident, type User } from "@/lib/api";

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/kamera", label: "Kamera", icon: Cctv },
  { to: "/riwayat", label: "Riwayat", icon: History },
  { to: "/pengaturan", label: "Pengaturan", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(() => getUser());
  const [floatingAlert, setFloatingAlert] = useState<Incident | null>(null);

  useEffect(() => {
    // Sync current user profile from backend
    authApi
      .getMe()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        // If not authenticated or token expired, keep cached user or allow graceful fallback
      });
  }, []);

  // Global WebSocket listener untuk notifikasi alarm real-time di seluruh halaman
  useEffect(() => {
    let ws: WebSocket | null = null;
    let heartbeatTimer: number | null = null;

    try {
      ws = new WebSocket(WS_BASE_URL);

      ws.onopen = () => {
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
            const incident = msg.data as Incident;
            setFloatingAlert(incident);
            playFallAlarm();
            showDesktopNotification(
              "🚨 PERINGATAN: Deteksi Jatuh!",
              `Kejadian jatuh terdeteksi pada ${incident.person_name || "orang"} di ${incident.location || "kamera"}!`,
            );
            window.dispatchEvent(new CustomEvent("rumi:fall-alert", { detail: incident }));
          }
        } catch {
          // ignore non-json
        }
      };
    } catch (e) {
      console.warn("Global WebSocket init error:", e);
    }

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (ws) ws.close();
    };
  }, []);

  function handleLogout() {
    authApi.logout();
    void navigate({ to: "/login" });
  }

  const avatarInitials = currentUser?.avatar_initials || "AP";
  const displayName = currentUser?.name || "Pak Andi";

  return (
    <div className="flex min-h-screen gap-5 p-3 pb-24 sm:p-4 sm:pb-24 lg:p-5 lg:pb-5">
      <aside className="card-shadow sticky top-5 hidden h-[calc(100vh-2.5rem)] w-60 shrink-0 flex-col rounded-4xl bg-card p-5 lg:flex">
        <div className="px-2 pb-7 pt-1">
          <Link to="/dashboard" className="inline-block">
            <BrandLogo
              imageClassName="size-12"
              textClassName="text-2xl font-extrabold text-primary"
            />
          </Link>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Sistem Deteksi Jatuh &amp; Monitoring CCTV
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground card-shadow"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon className="size-5" strokeWidth={2} />
                <span className="flex flex-1 items-center justify-between gap-2">
                  {item.label}
                  {item.to === "/riwayat" && (
                    <span
                      aria-label="Ada insiden baru"
                      className="size-2.5 rounded-full bg-destructive ring-2 ring-card"
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-5" strokeWidth={2} />
          Logout
        </button>
      </aside>

      <main className="mx-auto flex min-w-0 w-full max-w-[1600px] flex-1 flex-col">
        <div className="card-shadow mb-4 flex items-center justify-between rounded-3xl bg-card px-4 py-3 lg:hidden">
          <Link to="/dashboard" aria-label="Buka dashboard Rumi">
            <BrandLogo
              imageClassName="size-9"
              textClassName="text-xl font-extrabold text-primary"
            />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex size-10 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Logout"
          >
            <LogOut className="size-5" />
          </button>
        </div>

        <header className="flex items-center justify-between gap-3 px-1 pb-4 sm:px-2 sm:pb-6 lg:pt-1">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold text-foreground sm:text-2xl">
              Selamat Siang, {displayName}!
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Semua kamera dipantau secara real-time
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-card bg-primary text-xs font-bold text-primary-foreground sm:size-11">
            {avatarInitials}
          </span>
        </header>

        <div className="flex-1">{children}</div>
      </main>

      <nav
        aria-label="Navigasi utama"
        className="card-shadow fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-3xl border border-border/70 bg-card/95 p-1.5 backdrop-blur-md sm:left-1/2 sm:right-auto sm:w-[min(38rem,calc(100%-2rem))] sm:-translate-x-1/2 lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-row sm:justify-center sm:gap-2 sm:text-xs ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <item.icon className="size-5 shrink-0" strokeWidth={2} />
              <span className="truncate">{item.label}</span>
              {item.to === "/riwayat" && (
                <span
                  aria-label="Ada insiden baru"
                  className="absolute right-2 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-card sm:right-3"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Floating real-time alert toast for entire application */}
      {floatingAlert && (
        <aside
          role="alert"
          aria-live="assertive"
          className="card-shadow fixed inset-x-3 top-3 z-50 flex items-center gap-3 rounded-3xl border-2 border-destructive bg-card p-3 shadow-2xl animate-in slide-in-from-top-4 sm:left-auto sm:right-6 sm:top-6 sm:max-w-md sm:gap-4 sm:p-4"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive text-white animate-pulse">
            <Siren className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-destructive">
              🚨 Fall Alert Terdeteksi!
            </p>
            <p className="truncate text-sm font-bold text-foreground">
              {floatingAlert.camera_name || floatingAlert.location}
            </p>
            <p className="text-xs text-muted-foreground">
              {floatingAlert.person_name || "Seseorang"} jatuh · Segera periksa!
            </p>
          </div>
          <Button asChild size="sm" variant="destructive" className="rounded-full">
            <Link to="/riwayat" onClick={() => setFloatingAlert(null)}>
              Lihat
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setFloatingAlert(null)}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Tutup notifikasi"
          >
            <X className="size-4" />
          </button>
        </aside>
      )}
    </div>
  );
}
