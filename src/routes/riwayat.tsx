import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Loader2,
  Play,
  Trash2,
  ZoomIn,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { incidentApi, resolveMediaUrl, type Incident } from "@/lib/api";
import { useSavedCameras } from "@/lib/cameras";
import { useElderlyName } from "@/lib/elderly-profile";
import { markIncidentsRead } from "@/lib/incident-unread";

export const Route = createFileRoute("/riwayat")({
  head: () => ({
    meta: [
      { title: "Riwayat Deteksi Jatuh | Rumi" },
      {
        name: "description",
        content:
          "Riwayat notifikasi insiden deteksi jatuh: tanggal, lokasi kamera, snapshot, dan klip kejadian.",
      },
      { property: "og:title", content: "Riwayat Deteksi Jatuh | Rumi" },
      {
        property: "og:description",
        content:
          "Riwayat notifikasi insiden deteksi jatuh: tanggal, lokasi kamera, snapshot, dan klip kejadian.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RiwayatPage,
});

function formatIncidentDate(isoString?: string): { dateStr: string; timeStr: string } {
  if (!isoString) return { dateStr: "-", timeStr: "-" };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { dateStr: isoString, timeStr: "" };

    const dateStr = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = `${d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })} WIB`;

    return { dateStr, timeStr };
  } catch {
    return { dateStr: isoString, timeStr: "" };
  }
}

function RiwayatPage() {
  const elderlyName = useElderlyName();
  const savedCameras = useSavedCameras();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("7");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<Incident | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<Incident | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function loadIncidents() {
    try {
      setLoading(true);
      const filters: { days?: number; location?: string } = {};
      if (dateFilter !== "all") filters.days = Number(dateFilter);
      if (locationFilter !== "all") filters.location = locationFilter;
      const data = await incidentApi.list(filters);
      setIncidents(data);
    } catch (err) {
      console.error("Gagal memuat riwayat insiden:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    markIncidentsRead();
    void loadIncidents();
    // Filter changes are applied only after the user presses the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cameraLocations = Array.from(
    new Set(savedCameras.map((camera) => camera.location.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "id"));

  function handleApplyFilter() {
    void loadIncidents();
  }

  async function handleConfirmDeleteSingle() {
    if (!deletingTarget) return;
    const targetId = deletingTarget.id;
    setDeleteError("");
    try {
      setIsDeleting(true);
      await incidentApi.delete(targetId);
      setIncidents((prev) => prev.filter((item) => item.id !== targetId));
      if (selectedIncident?.id === targetId) setSelectedIncident(null);
      if (previewSnapshot?.id === targetId) setPreviewSnapshot(null);
      setDeletingTarget(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Gagal menghapus riwayat insiden.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleConfirmClearAll() {
    setDeleteError("");
    try {
      setIsDeleting(true);
      await incidentApi.clearAll();
      setIncidents([]);
      setSelectedIncident(null);
      setPreviewSnapshot(null);
      setConfirmClearAll(false);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Gagal membersihkan semua riwayat insiden.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-stretch gap-3 px-1 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <div>
            <h2 className="text-xl font-extrabold text-foreground">Riwayat Deteksi Jatuh</h2>
            <p className="text-sm text-muted-foreground">
              Semua insiden yang tercatat oleh sistem, lengkap dengan bukti snapshot.
            </p>
          </div>
          {incidents.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-destructive/30 bg-card text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
              onClick={() => {
                setDeleteError("");
                setConfirmClearAll(true);
              }}
            >
              <Trash2 className="size-4" />
              Bersihkan Semua Riwayat
            </Button>
          )}
        </div>

        {deleteError && (
          <p role="alert" className="px-2 text-xs font-semibold text-destructive">
            {deleteError}
          </p>
        )}

        {/* Filters */}
        <section className="card-shadow grid gap-4 rounded-3xl bg-card p-4 sm:grid-cols-2 sm:p-5 lg:flex lg:items-end">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="filter-date" className="text-xs font-bold text-foreground">
              Rentang Tanggal
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                id="filter-date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl bg-muted pl-9 pr-9 text-sm font-semibold text-foreground outline-none lg:w-auto"
              >
                <option value="7">7 hari terakhir</option>
                <option value="30">30 hari terakhir</option>
                <option value="90">3 bulan terakhir</option>
                <option value="all">Semua waktu</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="filter-location" className="text-xs font-bold text-foreground">
              Lokasi Kamera
            </label>
            <div className="relative">
              <select
                id="filter-location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl bg-muted pl-4 pr-9 text-sm font-semibold text-foreground outline-none lg:w-auto"
              >
                <option value="all">Semua lokasi</option>
                {cameraLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <Button
            className="rounded-full sm:col-span-2 lg:col-span-1"
            onClick={handleApplyFilter}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Terapkan Filter
          </Button>
        </section>

        {/* Incident table */}
        <section className="card-shadow overflow-hidden rounded-3xl bg-card">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <span className="ml-2 text-sm font-semibold">Memuat riwayat insiden...</span>
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="font-semibold">Tidak ada insiden yang tercatat pada rentang ini.</p>
            </div>
          ) : (
            <div>
              <table className="block w-full text-left text-sm md:table">
                <thead className="hidden md:table-header-group">
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-4 font-bold">Bukti</th>
                    <th className="px-5 py-4 font-bold">Tanggal &amp; Waktu</th>
                    <th className="px-5 py-4 font-bold">Lansia</th>
                    <th className="px-5 py-4 font-bold">Kamera / Lokasi</th>
                    <th className="px-5 py-4 font-bold">Klip</th>
                    <th className="px-5 py-4 text-right font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group">
                  {incidents.map((incident) => {
                    const { dateStr, timeStr } = formatIncidentDate(incident.detected_at);
                    const imageSrc = resolveMediaUrl(incident.snapshot_url);

                    return (
                      <tr
                        key={incident.id}
                        className="grid grid-cols-[5rem_1fr] gap-x-4 border-b border-border px-4 py-4 last:border-0 md:table-row md:px-0 md:py-0"
                      >
                        <td className="row-span-4 py-1 md:table-cell md:px-5 md:py-3">
                          <button
                            type="button"
                            onClick={() => imageSrc && setPreviewSnapshot(incident)}
                            disabled={!imageSrc}
                            title={
                              imageSrc
                                ? "Klik untuk melihat foto bukti snapshot resolusi penuh"
                                : "Bukti tidak tersedia"
                            }
                            className="group relative flex h-12 w-20 items-center justify-center overflow-hidden rounded-xl bg-muted text-center text-[10px] text-muted-foreground transition-all duration-200 hover:scale-105 hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:pointer-events-none disabled:opacity-60"
                          >
                            Bukti tidak tersedia
                            {imageSrc && (
                              <>
                                <img
                                  src={imageSrc}
                                  alt={`Snapshot insiden ${incident.camera_name || incident.location}`}
                                  width={1280}
                                  height={720}
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                  }}
                                  className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                  <ZoomIn className="size-4 text-white drop-shadow" />
                                </div>
                              </>
                            )}
                          </button>
                        </td>

                        <td
                          data-label="Waktu"
                          className="flex min-w-0 items-start justify-between gap-3 py-1 font-semibold text-foreground before:text-xs before:font-medium before:text-muted-foreground before:content-[attr(data-label)] md:table-cell md:px-5 md:py-3 md:before:hidden"
                        >
                          {dateStr}
                          <span className="block text-xs font-medium text-muted-foreground">
                            {timeStr}
                          </span>
                        </td>
                        <td
                          data-label="Lansia"
                          className="flex min-w-0 items-start justify-between gap-3 py-1 font-semibold text-foreground before:text-xs before:font-medium before:text-muted-foreground before:content-[attr(data-label)] md:table-cell md:px-5 md:py-3 md:before:hidden"
                        >
                          <span className="min-w-0 text-right md:text-left">
                            {elderlyName || incident.person_name || "Lansia"}
                          </span>
                        </td>
                        <td
                          data-label="Kamera"
                          className="flex min-w-0 items-start justify-between gap-3 py-1 font-semibold text-foreground before:text-xs before:font-medium before:text-muted-foreground before:content-[attr(data-label)] md:table-cell md:px-5 md:py-3 md:before:hidden"
                        >
                          <span className="min-w-0 text-right md:text-left">
                            {incident.camera_name || incident.location}
                          </span>
                        </td>
                        <td
                          data-label="Klip"
                          className="flex items-center justify-between gap-3 py-1 before:text-xs before:font-medium before:text-muted-foreground before:content-[attr(data-label)] md:table-cell md:px-5 md:py-3 md:before:hidden"
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-auto rounded-full px-3 py-1.5 text-xs"
                            disabled={!incident.clip_url}
                            onClick={() => setSelectedIncident(incident)}
                          >
                            <Play className="size-3" />
                            {incident.clip_url
                              ? incident.clip_duration || "Putar"
                              : "Tidak tersedia"}
                          </Button>
                        </td>
                        <td className="col-span-2 flex justify-end pt-2 md:table-cell md:px-5 md:py-3 md:text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto rounded-full bg-card px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              setDeleteError("");
                              setDeletingTarget(incident);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Dialog
          open={Boolean(selectedIncident)}
          onOpenChange={(open) => {
            if (!open) setSelectedIncident(null);
          }}
        >
          <DialogContent className="max-w-3xl rounded-3xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Klip Kejadian Jatuh</DialogTitle>
              <DialogDescription>
                {selectedIncident?.camera_name || selectedIncident?.location} ·{" "}
                {formatIncidentDate(selectedIncident?.detected_at).dateStr}
              </DialogDescription>
            </DialogHeader>
            {selectedIncident?.clip_url && (
              <video
                key={selectedIncident.id}
                controls
                autoPlay
                preload="metadata"
                poster={resolveMediaUrl(selectedIncident.snapshot_url)}
                className="max-h-[70vh] w-full rounded-2xl bg-black"
              >
                <source src={resolveMediaUrl(selectedIncident.clip_url)} />
                Browser Anda tidak mendukung pemutaran video.
              </video>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Preview Screenshot / Snapshot Bukti */}
        <Dialog
          open={Boolean(previewSnapshot)}
          onOpenChange={(open) => {
            if (!open) setPreviewSnapshot(null);
          }}
        >
          <DialogContent className="max-w-4xl overflow-hidden rounded-3xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Bukti Snapshot Deteksi Jatuh</DialogTitle>
              <DialogDescription className="text-sm">
                {previewSnapshot?.camera_name || previewSnapshot?.location} ·{" "}
                {formatIncidentDate(previewSnapshot?.detected_at).dateStr} pukul{" "}
                {formatIncidentDate(previewSnapshot?.detected_at).timeStr}
                {previewSnapshot && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Lansia: {elderlyName || previewSnapshot.person_name || "Lansia"}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {previewSnapshot?.snapshot_url && (
              <div className="mt-2 flex flex-col items-center">
                <div className="relative flex max-h-[72vh] w-full items-center justify-center overflow-hidden rounded-2xl bg-black/95">
                  <img
                    src={resolveMediaUrl(previewSnapshot.snapshot_url)}
                    alt={`Bukti insiden ${previewSnapshot.camera_name || previewSnapshot.location}`}
                    className="max-h-[70vh] w-full object-contain"
                  />
                </div>
                <div className="mt-4 flex w-full flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Snapshot otomatis tersimpan saat indikasi jatuh terkonfirmasi oleh model AI.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-card gap-1.5"
                    asChild
                  >
                    <a
                      href={resolveMediaUrl(previewSnapshot.snapshot_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-3.5" />
                      Buka Ukuran Asli
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Konfirmasi Hapus 1 Riwayat */}
        <AlertDialog
          open={Boolean(deletingTarget)}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeletingTarget(null);
          }}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus riwayat insiden?</AlertDialogTitle>
              <AlertDialogDescription>
                Riwayat kejadian di{" "}
                <span className="font-semibold text-foreground">
                  {deletingTarget?.camera_name || deletingTarget?.location || "kamera ini"}
                </span>{" "}
                ({formatIncidentDate(deletingTarget?.detected_at).dateStr}{" "}
                {formatIncidentDate(deletingTarget?.detected_at).timeStr}) beserta snapshot dan klip
                buktinya akan dihapus permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full" disabled={isDeleting}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleConfirmDeleteSingle();
                }}
                disabled={isDeleting}
                className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal Konfirmasi Bersihkan Semua Riwayat */}
        <AlertDialog
          open={confirmClearAll}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setConfirmClearAll(false);
          }}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Bersihkan semua riwayat insiden?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua catatan insiden beserta file snapshot dan klip video terkait akan dihapus
                permanen dan tidak dapat dikembalikan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full" disabled={isDeleting}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleConfirmClearAll();
                }}
                disabled={isDeleting}
                className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Hapus Semua
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
