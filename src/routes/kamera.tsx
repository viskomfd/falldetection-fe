import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  CameraOff,
  Cctv,
  Loader2,
  MapPin,
  Plus,
  Power,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

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
import { modelApi } from "@/lib/api";
import {
  addCamera,
  getDeviceFacingMode,
  removeCamera,
  updateCameraStatus,
  useSavedCameras,
  type DeviceFacingMode,
} from "@/lib/cameras";

type CameraSourceType = "stream" | "device";

function DeviceCameraPreview({ facingMode }: { facingMode: DeviceFacingMode }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;

    async function openPreview() {
      setLoading(true);
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setLoading(false);
        setError(
          typeof window !== "undefined" && !window.isSecureContext
            ? "Akses kamera diblokir browser pada koneksi HTTP. Gunakan HTTPS (mis. ngrok / Cloudflare Tunnel) atau localhost."
            : "Browser tidak mendukung preview kamera.",
        );
        return;
      }

      try {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 640 },
              height: { ideal: 360 },
            },
            audio: false,
          });
        } catch {
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (cancelled) {
          activeStream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          await videoRef.current.play();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Tidak dapat mengakses kamera device.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void openPreview();

    return () => {
      cancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [facingMode]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black/90">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs font-semibold">Membuka preview kamera...</span>
        </div>
      )}
      {!loading && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-muted p-4 text-center">
          <CameraOff className="size-6 text-destructive/80" />
          <span className="max-w-xs text-xs font-semibold text-destructive">{error}</span>
        </div>
      )}
      {!loading && !error && (
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
          <span className="size-1.5 rounded-full bg-success" />
          Preview · {facingMode === "user" ? "Kamera Depan" : "Kamera Belakang"}
        </span>
      )}
    </div>
  );
}

export const Route = createFileRoute("/kamera")({
  head: () => ({
    meta: [
      { title: "Kamera CCTV | Rumi" },
      {
        name: "description",
        content:
          "Kelola daftar kamera CCTV: tambah, edit, dan hapus kamera device atau feed RTSP/HTTP yang diproses model deteksi jatuh.",
      },
      { property: "og:title", content: "Kamera CCTV | Rumi" },
      {
        property: "og:description",
        content:
          "Kelola daftar kamera CCTV: tambah, edit, dan hapus kamera device atau feed RTSP/HTTP yang diproses model deteksi jatuh.",
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
  const [sourceType, setSourceType] = useState<CameraSourceType>("stream");
  const [deviceFacing, setDeviceFacing] = useState<DeviceFacingMode>("environment");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState("");
  const [resettingTrackers, setResettingTrackers] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState("");

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setFormError("");
      setSourceType("stream");
      setDeviceFacing("environment");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("name") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const url =
      sourceType === "device"
        ? `device://${deviceFacing}`
        : String(form.get("url") ?? "").trim();

    if (!name || !location || !url) {
      setFormError("Semua kolom harus diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");
      await addCamera({ name, location, url });
      formEl.reset();
      handleDialogOpenChange(false);
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

  async function handleToggleStatus(id: string, currentStatus?: "online" | "offline") {
    const nextStatus: "online" | "offline" = currentStatus === "offline" ? "online" : "offline";
    setStatusError("");
    try {
      setTogglingId(id);
      await updateCameraStatus(id, nextStatus);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Status kamera gagal diperbarui.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleResetTrackers() {
    setResettingTrackers(true);
    setTrackerStatus("");
    try {
      const res = await modelApi.resetTrackers();
      setTrackerStatus(res.message || "Tracker AI berhasil direset.");
    } catch (error) {
      setTrackerStatus(
        error instanceof Error ? error.message : "Tracker AI gagal direset.",
      );
    } finally {
      setResettingTrackers(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-stretch gap-3 px-1 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <div>
            <h2 className="text-xl font-extrabold text-foreground">Kamera CCTV</h2>
            <p className="text-sm text-muted-foreground">
              Daftarkan kamera device atau stream RTSP/HTTP untuk diproses model deteksi jatuh.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full bg-card sm:w-auto"
              disabled={resettingTrackers}
              onClick={() => void handleResetTrackers()}
            >
              {resettingTrackers ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              {resettingTrackers ? "Mereset..." : "Reset Tracker AI"}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
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
                  {sourceType === "stream"
                    ? "Untuk IP Webcam Android, gunakan alamat video yang ditampilkan aplikasi, biasanya http://IP-HP:8080/video."
                    : "Gunakan kamera laptop atau HP secara langsung dengan deteksi on-device di browser."}
                </DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-foreground">Sumber Kamera</span>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceType("stream");
                        setFormError("");
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                        sourceType === "stream"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Cctv className="size-4" />
                      RTSP / HTTP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceType("device");
                        setFormError("");
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                        sourceType === "device"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Camera className="size-4" />
                      Kamera Device
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="camera-name" className="text-xs font-bold text-foreground">
                    Nama Kamera
                  </label>
                  <Input
                    id="camera-name"
                    name="name"
                    placeholder={
                      sourceType === "device" ? "cth. Webcam Laptop" : "cth. Kamera Android"
                    }
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

                {sourceType === "stream" ? (
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
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-foreground">Lensa Kamera</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeviceFacing("environment")}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                            deviceFacing === "environment"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Kamera Belakang / Default
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeviceFacing("user")}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                            deviceFacing === "user"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Kamera Depan
                        </button>
                      </div>
                    </div>
                    {dialogOpen && <DeviceCameraPreview facingMode={deviceFacing} />}
                    <p className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        Deteksi jatuh YOLO11 berjalan langsung di browser (WebAssembly). Video tidak
                        dikirim ke server mana pun.
                      </span>
                    </p>
                  </div>
                )}

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
        </div>

        {(trackerStatus || statusError) && (
          <div className="flex flex-col gap-1 px-1 sm:px-2">
            {trackerStatus && (
              <p role="status" className="text-xs font-semibold text-primary">
                {trackerStatus}
              </p>
            )}
            {statusError && (
              <p role="alert" className="text-xs font-semibold text-destructive">
                {statusError}
              </p>
            )}
          </div>
        )}

        {savedCameras.length === 0 ? (
          <div className="card-shadow flex flex-col items-center justify-center rounded-3xl bg-card p-6 text-center sm:p-12">
            <Cctv className="size-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-bold text-foreground">Belum ada kamera terdaftar</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Klik tombol &quot;Tambah Kamera&quot; di atas untuk menghubungkan kamera device atau
              stream RTSP/HTTP.
            </p>
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {savedCameras.map((camera, index) => {
              const isOffline = camera.status === "offline";
              const isDevice = camera.protocol === "DEVICE";
              const sourceLabel = isDevice
                ? `Kamera Device (${getDeviceFacingMode(camera.url) === "user" ? "Depan" : "Belakang"}) · On-Device`
                : camera.url;

              return (
                <article
                  key={camera.id}
                  className="card-shadow overflow-hidden rounded-3xl bg-card"
                >
                  <div data-camera-frame className="relative overflow-hidden bg-muted">
                    <CameraStream
                      cameraId={camera.id}
                      name={camera.name}
                      location={camera.location}
                      url={camera.url}
                      protocol={camera.protocol}
                      status={camera.status}
                    />
                    <span className="camera-live-only absolute left-3 top-3">
                      <Badge className="rounded-full bg-primary">
                        {isDevice ? "Device" : camera.protocol}
                      </Badge>
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
                      {sourceLabel}
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-card"
                        disabled={togglingId === camera.id}
                        onClick={() => void handleToggleStatus(camera.id, camera.status)}
                      >
                        {togglingId === camera.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Power className="size-4" />
                        )}
                        {isOffline ? "Aktifkan" : "Nonaktifkan"}
                      </Button>
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
