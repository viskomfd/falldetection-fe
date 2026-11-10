import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ChevronDown, Loader2, Play } from "lucide-react";
import { useEffect, useState } from "react";

import fallSnapshot from "@/assets/fall-snapshot.jpg";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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

  async function loadIncidents() {
    try {
      setLoading(true);
      const data = await incidentApi.list({
        days: dateFilter === "all" ? undefined : Number(dateFilter),
        location: locationFilter === "all" ? undefined : locationFilter,
      });
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

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <div className="px-2">
          <h2 className="text-xl font-extrabold text-foreground">Riwayat Deteksi Jatuh</h2>
          <p className="text-sm text-muted-foreground">
            Semua insiden yang tercatat oleh sistem, lengkap dengan bukti snapshot.
          </p>
        </div>

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
                  </tr>
                </thead>
                <tbody className="block md:table-row-group">
                  {incidents.map((incident) => {
                    const { dateStr, timeStr } = formatIncidentDate(incident.detected_at);
                    const imageSrc = incident.snapshot_url
                      ? resolveMediaUrl(incident.snapshot_url)
                      : fallSnapshot;

                    return (
                      <tr
                        key={incident.id}
                        className="grid grid-cols-[5rem_1fr] gap-x-4 border-b border-border px-4 py-4 last:border-0 md:table-row md:px-0 md:py-0"
                      >
                        <td className="row-span-4 py-1 md:table-cell md:px-5 md:py-3">
                          <img
                            src={imageSrc}
                            alt={`Snapshot insiden ${incident.camera_name || incident.location}`}
                            width={1280}
                            height={720}
                            loading="lazy"
                            onError={(e) => {
                              // Fallback if remote image not found
                              (e.target as HTMLImageElement).src = fallSnapshot;
                            }}
                            className="h-12 w-20 rounded-xl object-cover"
                          />
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
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground">
                            <Play className="size-3" />
                            {incident.clip_duration || "8 dtk"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
