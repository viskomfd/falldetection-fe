import { createFileRoute } from "@tanstack/react-router";
import { Cctv, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { AppShell } from "@/components/app-shell";
import { CameraFullscreenButton } from "@/components/camera-fullscreen-button";
import { CameraStream } from "@/components/camera-stream";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addCamera, removeCamera, useSavedCameras } from "@/lib/cameras";

export const Route = createFileRoute("/kamera")({
  head: () => ({
    meta: [
      { title: "Kamera CCTV | Rumi" },
      {
        name: "description",
        content:
          "Kelola daftar kamera CCTV: tambah, edit, dan hapus feed RTSP/HTTP yang diproses model deteksi jatuh.",
      },
      { property: "og:title", content: "Kamera CCTV | Rumi" },
      {
        property: "og:description",
        content:
          "Kelola daftar kamera CCTV: tambah, edit, dan hapus feed RTSP/HTTP yang diproses model deteksi jatuh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KameraPage,
});

function KameraPage() {
  const savedCameras = useSavedCameras();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const url = String(form.get("url") ?? "").trim();

    if (!name || !location || !url) {
      setFormError("Semua kolom harus diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");
      await addCamera({ name, location, url });
      setDialogOpen(false);
      event.currentTarget.reset();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Kamera gagal ditambahkan");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      await removeCamera(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-stretch gap-3 px-1 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <div>
            <h2 className="text-xl font-extrabold text-foreground">Kamera CCTV</h2>
            <p className="text-sm text-muted-foreground">
              Daftarkan stream RTSP/HTTP untuk diproses model deteksi jatuh.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full rounded-full sm:w-auto">
                <Plus className="size-4" />
                Tambah Kamera
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Tambah kamera baru</DialogTitle>
                <DialogDescription>
                  Untuk IP Webcam Android, gunakan alamat video yang ditampilkan aplikasi, biasanya
                  http://IP-HP:8080/video.
                </DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="camera-name" className="text-xs font-bold text-foreground">
                    Nama Kamera
                  </label>
                  <Input
                    id="camera-name"
                    name="name"
                    placeholder="cth. Kamera Android"
                    className="rounded-xl bg-muted"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="camera-location" className="text-xs font-bold text-foreground">
                    Lokasi
                  </label>
                  <Input
                    id="camera-location"
                    name="location"
                    placeholder="cth. Ruang Keluarga"
                    className="rounded-xl bg-muted"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="camera-url" className="text-xs font-bold text-foreground">
                    URL Stream HTTP / RTSP
                  </label>
                  <Input
                    id="camera-url"
                    name="url"
                    type="url"
                    placeholder="http://192.168.1.10:8080/video"
                    className="rounded-xl bg-muted font-mono text-xs"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    HTTP/MJPEG dapat diputar langsung. RTSP disimpan, tetapi memerlukan gateway
                    HLS/WebRTC agar dapat diputar oleh browser.
                  </p>
                </div>
                {formError && <p className="text-sm font-semibold text-destructive">{formError}</p>}
                <DialogFooter>
                  <Button type="submit" className="rounded-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {isSubmitting ? "Menyimpan..." : "Tambahkan Kamera"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {savedCameras.length === 0 ? (
          <div className="card-shadow flex flex-col items-center justify-center rounded-3xl bg-card p-6 text-center sm:p-12">
            <Cctv className="size-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-bold text-foreground">Belum ada kamera terdaftar</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Klik tombol &quot;Tambah Kamera&quot; di atas untuk menghubungkan stream CCTV atau IP
              Webcam.
            </p>
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {savedCameras.map((camera, index) => {
              const isOffline = camera.status === "offline";
              return (
                <article
                  key={camera.id}
                  className="card-shadow overflow-hidden rounded-3xl bg-card"
                >
                  <div data-camera-frame className="relative overflow-hidden bg-muted">
                    <CameraStream
                      cameraId={camera.id}
                      name={camera.name}
                      url={camera.url}
                      protocol={camera.protocol}
                    />
                    <span className="camera-live-only absolute left-3 top-3">
                      <Badge className="rounded-full bg-primary">{camera.protocol}</Badge>
                    </span>
                    {isOffline && (
                      <span className="absolute left-3 top-3">
                        <Badge className="rounded-full bg-destructive">Offline</Badge>
                      </span>
                    )}
                    <CameraFullscreenButton cameraName={camera.name} />
                  </div>
                  <div className="flex flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-foreground">{camera.name}</h3>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3.5" />
                          {camera.location} · Cam {String(index + 1).padStart(2, "0")}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`rounded-full ${camera.status === "online" ? "bg-success/15 text-success" : ""}`}
                      >
                        {camera.status || "online"}
                      </Badge>
                    </div>
                    <p className="truncate rounded-xl bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                      {camera.url}
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-card text-destructive"
                        disabled={deletingId === camera.id}
                        onClick={() => handleDelete(camera.id)}
                      >
                        {deletingId === camera.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Hapus
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </AppShell>
  );
}
