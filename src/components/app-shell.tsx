import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Cctv,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { authApi, getUser, type User } from "@/lib/api";

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

  useEffect(() => {
    // Sync current user profile from backend
    authApi
      .getMe()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        // If not authenticated or token expired, keep cached user or allow graceful fallback
      });
  }, []);

  function handleLogout() {
    authApi.logout();
    void navigate({ to: "/login" });
  }

  const avatarInitials = currentUser?.avatar_initials || "AP";
  const displayName = currentUser?.name || "Pak Andi";

  return (
    <div className="flex min-h-screen gap-5 p-5">
      <aside className="card-shadow sticky top-5 flex h-[calc(100vh-2.5rem)] w-60 shrink-0 flex-col rounded-4xl bg-card p-5">
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

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 px-2 pb-6 pt-1">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">
              Selamat Siang, {displayName}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Semua kamera dipantau secara real-time
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center -space-x-3">
              <span className="flex size-11 items-center justify-center rounded-full border-2 border-card bg-primary text-xs font-bold text-primary-foreground">
                {avatarInitials}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
