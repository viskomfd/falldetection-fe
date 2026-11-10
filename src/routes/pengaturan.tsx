import { createFileRoute } from "@tanstack/react-router";
import { Cctv, HeartHandshake, Lock, Mail, Smartphone } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authApi, getUser, type User } from "@/lib/api";
import { getElderlyName, saveElderlyName } from "@/lib/elderly-profile";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan | Rumi" },
      {
        name: "description",
        content:
          "Kelola akun, notifikasi fall alert, dan protokol stream yang didukung sistem deteksi jatuh.",
      },
      { property: "og:title", content: "Pengaturan | Rumi" },
      {
        property: "og:description",
        content:
          "Kelola akun, notifikasi fall alert, dan protokol stream yang didukung sistem deteksi jatuh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PengaturanPage,
});

const NOTIFICATIONS = [
  {
    id: "popup",
    title: "Pop-up Fall Alert di Dashboard",
    description: "Tampilkan banner merah segera saat insiden terdeteksi.",
    defaultChecked: true,
  },
  {
    id: "sound",
    title: "Alarm Suara",
    description: "Bunyikan alarm visual & audio saat fall alert diterima.",
    defaultChecked: true,
  },
  {
    id: "push",
    title: "Notifikasi Perangkat Pendamping",
    description: "Kirim alert ke seluruh perangkat pendamping yang terdaftar.",
    defaultChecked: true,
  },
  {
    id: "digest",
    title: "Ringkasan Harian",
    description: "Kirim rekap insiden & status kamera setiap pagi.",
    defaultChecked: false,
  },
];

function PengaturanPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getUser());
  const [elderlyName, setElderlyName] = useState(() => getElderlyName());
  const [elderlySaved, setElderlySaved] = useState(false);
  const [elderlyError, setElderlyError] = useState("");

  useEffect(() => {
    authApi
      .getMe()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        // Fallback to local user
      });
  }, []);

  function handleLogoutAll() {
    authApi.logout();
  }

  function handleElderlySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      saveElderlyName(elderlyName);
      setElderlyName(getElderlyName());
      setElderlyError("");
      setElderlySaved(true);
    } catch (error) {
      setElderlyError(error instanceof Error ? error.message : "Nama lansia gagal disimpan.");
    }
  }

  const name = currentUser?.name || "Andi Pratama";
  const email = currentUser?.email || "andi.pratama@keluarga.id";
  const role = currentUser?.role || "Pendamping";
  const initials = currentUser?.avatar_initials || "AP";

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <div className="px-2">
          <h2 className="text-xl font-extrabold text-foreground">Pengaturan</h2>
          <p className="text-sm text-muted-foreground">
            Atur akun, preferensi notifikasi, dan keamanan data.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Account */}
          <section className="card-shadow flex flex-col gap-4 rounded-3xl bg-card p-4 sm:p-6">
            <h3 className="font-bold text-foreground">Akun</h3>
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-foreground">{name}</p>
                <p className="flex min-w-0 items-start gap-1.5 break-all text-sm text-muted-foreground">
                  <Mail className="mt-0.5 size-4 shrink-0" />
                  <span>{email}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full">
                Peran: {role}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Sistem AI Aktif
              </Badge>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="w-full rounded-full bg-card sm:w-auto">
                Edit Profil
              </Button>
              <Button variant="outline" className="w-full rounded-full bg-card sm:w-auto">
                Ganti Password
              </Button>
            </div>
          </section>

          {/* Elderly profile */}
          <section className="card-shadow flex flex-col gap-4 rounded-3xl bg-card p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <HeartHandshake className="size-5" />
              </span>
              <div>
                <h3 className="font-bold text-foreground">Profil Lansia</h3>
                <p className="text-xs text-muted-foreground">
                  Digunakan pada dashboard dan notifikasi deteksi jatuh.
                </p>
              </div>
            </div>
            <form
              onSubmit={handleElderlySubmit}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="settings-elderly-name">Nama Lansia</Label>
                <Input
                  id="settings-elderly-name"
                  required
                  value={elderlyName}
                  onChange={(event) => {
                    setElderlyName(event.target.value);
                    setElderlySaved(false);
                    setElderlyError("");
                  }}
                  placeholder="Contoh: Ibu Siti"
                  className="rounded-xl bg-muted"
                />
              </div>
              <Button type="submit" className="rounded-full">
                Simpan
              </Button>
            </form>
            {elderlyError && (
              <p className="text-xs font-semibold text-destructive">{elderlyError}</p>
            )}
            {elderlySaved && (
              <p role="status" className="text-xs font-semibold text-success">
                Nama lansia berhasil diperbarui.
              </p>
            )}
          </section>

          {/* Notifications */}
          <section className="card-shadow flex flex-col gap-4 rounded-3xl bg-card p-4 sm:p-6">
            <h3 className="font-bold text-foreground">Notifikasi Fall Alert</h3>
            {NOTIFICATIONS.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </section>

          {/* Protocols */}
          <section className="card-shadow flex flex-col gap-4 rounded-3xl bg-card p-4 sm:p-6">
            <h3 className="font-bold text-foreground">Protokol Stream Didukung</h3>
            <p className="text-sm text-muted-foreground">
              Mode CCTV menerima input video melalui protokol berikut untuk pemrosesan AI.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                { name: "RTSP", detail: "rtsp://user:pass@ip:554/stream1", tone: "primary" },
                { name: "HTTP / MJPEG", detail: "http://ip:8080/video", tone: "secondary" },
                { name: "HLS", detail: "http://ip/live/stream.m3u8", tone: "secondary" },
              ].map((protocol) => (
                <li
                  key={protocol.name}
                  className="flex flex-col items-start gap-2 rounded-2xl bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Cctv className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="break-all font-mono text-xs text-muted-foreground">
                      {protocol.detail}
                    </span>
                  </div>
                  <Badge
                    className={
                      protocol.tone === "primary"
                        ? "rounded-full"
                        : "rounded-full bg-secondary text-secondary-foreground"
                    }
                  >
                    {protocol.name}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Frame extraction berjalan otomatis dan koneksi tersambung ulang sendiri saat terputus.
            </p>
          </section>

          {/* Security */}
          <section className="card-shadow flex flex-col gap-4 rounded-3xl bg-card p-4 sm:p-6">
            <h3 className="font-bold text-foreground">Keamanan Data</h3>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Lock className="mt-0.5 size-4 text-primary" />
                Password disimpan ter-hash (bcrypt/argon2), tidak pernah dikirim dalam teks polos.
              </li>
              <li className="flex items-start gap-3">
                <Lock className="mt-0.5 size-4 text-primary" />
                Komunikasi dashboard terenkripsi via HTTPS/WSS.
              </li>
              <li className="flex items-start gap-3">
                <Smartphone className="mt-0.5 size-4 text-primary" />
                Sesi aktif: JWT Token tersimpan aman di browser Anda.
              </li>
            </ul>
            <div>
              <Button
                variant="outline"
                className="w-full rounded-full bg-card text-destructive sm:w-auto"
                onClick={handleLogoutAll}
              >
                Keluar dari Semua Perangkat
              </Button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
