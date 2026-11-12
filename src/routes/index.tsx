import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BellRing,
  Camera,
  Cctv,
  Check,
  ChevronRight,
  Expand,
  Eye,
  History,
  House,
  ListFilter,
  MapPin,
  Play,
  Radio,
  ScanLine,
  ShieldCheck,
  Siren,
  Video,
  Wifi,
} from "lucide-react";

import feedBedroom from "@/assets/feed-bedroom.jpg";
import feedKitchen from "@/assets/feed-kitchen.jpg";
import feedLivingRoom from "@/assets/feed-living-room.jpg";
import fallSnapshot from "@/assets/fall-snapshot.jpg";
import landingCameraPhone from "@/assets/landing-camera-phone.png";
import landingDashboardTablet from "@/assets/landing-dashboard-tablet.png";
import landingFallDetection from "@/assets/landing-fall-detection.png";
import landingSettingsPhone from "@/assets/landing-settings-phone.png";
import { BrandLogo } from "@/components/brand-logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rumi | Deteksi Jatuh Lewat CCTV Rumah" },
      {
        name: "description",
        content:
          "Platform monitoring CCTV yang membantu pendamping melihat indikasi jatuh, menerima notifikasi, dan meninjau riwayat kejadian.",
      },
      { property: "og:title", content: "Rumi | Deteksi Jatuh Lewat CCTV Rumah" },
      {
        property: "og:description",
        content: "Pantau kamera, kenali lokasi, dan tinjau bukti kejadian dari satu dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const BENEFITS = [
  {
    icon: ScanLine,
    title: "Indikasi jatuh",
    description: "Simulasi visi komputer mengenali pola gerak dari feed kamera.",
  },
  {
    icon: BellRing,
    title: "Notifikasi terpusat",
    description: "Lokasi, waktu, dan snapshot insiden tampil dalam satu konteks.",
  },
  {
    icon: Cctv,
    title: "Kamera yang sudah ada",
    description: "Tambahkan sumber HTTP/MJPEG tanpa sensor yang dikenakan pengguna.",
  },
  {
    icon: History,
    title: "Bukti kejadian",
    description: "Tinjau kembali snapshot berdasarkan waktu dan lokasi kamera.",
  },
];

const STEPS = [
  {
    icon: Camera,
    title: "Hubungkan kamera",
    text: "Tambahkan nama, lokasi, dan URL IP camera dari jaringan rumah.",
  },
  {
    icon: Eye,
    title: "Pantau beberapa ruang",
    text: "Lihat feed, status koneksi, dan lokasi kamera dari satu dashboard.",
  },
  {
    icon: Siren,
    title: "Lihat indikasi insiden",
    text: "Notifikasi menampilkan snapshot, waktu, dan kamera sumber.",
  },
  {
    icon: History,
    title: "Tinjau bukti",
    text: "Buka riwayat untuk melihat kembali detail kejadian yang tersimpan.",
  },
];

const FAQS = [
  {
    q: "Apakah Rumi sudah mendeteksi jatuh secara nyata?",
    a: "Rumi memproses feed kamera melalui model deteksi jatuh di backend. Akurasi deteksi tetap dipengaruhi kualitas video, sudut kamera, pencahayaan, dan kondisi jaringan.",
  },
  {
    q: "Kamera apa yang dapat ditambahkan?",
    a: "Rumi menerima URL HTTP, HTTPS, dan RTSP. HTTP/MJPEG dapat diputar langsung jika jaringan dan browser mengizinkan. RTSP memerlukan media gateway agar dapat diputar di browser.",
  },
  {
    q: "Apakah Rumi menggantikan pendamping atau layanan darurat?",
    a: "Tidak. Rumi diposisikan sebagai alat monitoring dan notifikasi, bukan perangkat medis, diagnosis klinis, atau layanan dispatch darurat.",
  },
  {
    q: "Di mana data kamera disimpan?",
    a: "Data kamera, profil lansia, dan riwayat insiden dikelola melalui backend Rumi agar tetap tersedia saat akun dibuka dari perangkat lain.",
  },
];

function BrowserBar({ path }: { path: string }) {
  return (
    <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3">
      <div className="flex gap-1.5">
        <span className="size-2 rounded-full bg-[#ff6b61]" />
        <span className="size-2 rounded-full bg-[#f7bd52]" />
        <span className="size-2 rounded-full bg-[#66d6ac]" />
      </div>
      <div className="mx-auto flex h-5 w-[62%] items-center justify-center rounded-full bg-white/[0.06] text-[8px] text-white/35">
        app.rumi.id/{path}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#0d7166]/15 bg-white/75 px-3 py-1.5 text-xs font-bold text-[#0d7166] shadow-sm backdrop-blur">
      <span className="size-1.5 rounded-full bg-[#0d7166] shadow-[0_0_10px_#65cfb8]" />
      {children}
    </span>
  );
}

function Landing() {
  return (
    <div className="rumi-night min-h-screen overflow-hidden bg-[#f7fbf9] text-[#0a3934]">
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-[#d8e9e4] bg-white/85 px-3 py-2 shadow-[0_12px_40px_-24px_#0d716680] backdrop-blur-xl sm:px-5">
          <a href="#beranda" aria-label="Rumi, kembali ke beranda">
            <BrandLogo imageClassName="size-9" textClassName="text-[#0d7166]" />
          </a>
          <div className="hidden items-center gap-8 text-xs font-semibold text-[#55736d] md:flex">
            <a href="#simulasi" className="transition-colors hover:text-[#0d7166]">
              Simulasi
            </a>
            <a href="#fitur" className="transition-colors hover:text-[#0d7166]">
              Fitur
            </a>
            <a href="#cara-kerja" className="transition-colors hover:text-[#0d7166]">
              Cara kerja
            </a>
            <a href="#faq" className="transition-colors hover:text-[#0d7166]">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="hidden rounded-full text-[#315c56] hover:bg-[#e4f3ee] hover:text-[#0d7166] sm:inline-flex"
            >
              <Link to="/register">Register</Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-[#0d7166] px-5 font-bold text-white hover:bg-[#095e55]"
            >
              <Link to="/login">
                Login <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section
          id="beranda"
          className="rumi-night-hero relative min-h-[960px] px-4 pb-28 pt-36 sm:pt-44"
        >
          <div className="rumi-aurora rumi-aurora-one" />
          <div className="rumi-aurora rumi-aurora-two" />
          <div className="relative z-10 mx-auto max-w-6xl text-center">
            <SectionLabel>Pemantauan CCTV rumah</SectionLabel>
            <h1 className="mx-auto mt-7 max-w-4xl text-[2.35rem] leading-[0.95] font-bold tracking-[-0.055em] sm:text-7xl lg:text-[5.7rem]">
              <span className="block">Deteksi jatuh.</span>
              <span className="block whitespace-nowrap text-[#0d7166]">Lewat CCTV rumah.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-[#55736d] sm:text-lg">
              Pantau kamera dan lihat indikasi jatuh dari satu dashboard.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[#0d7166] px-7 font-extrabold text-white shadow-lg shadow-[#0d7166]/15 hover:bg-[#095e55]"
              >
                <a href="#simulasi">
                  <Play className="size-4 fill-current" /> Lihat simulasi
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-[#c9dfd9] bg-white/70 px-7 font-bold text-[#0a3934] hover:bg-white hover:text-[#0d7166]"
              >
                <Link to="/login">Coba Rumi</Link>
              </Button>
            </div>

            <div className="rumi-device-stage relative mx-auto mt-20 h-[300px] max-w-5xl sm:h-[520px]">
              <img
                src={landingCameraPhone}
                alt="Tampilan halaman kamera Rumi di ponsel"
                className="absolute left-[2%] top-[18%] z-30 w-[25%] -rotate-6 drop-shadow-2xl sm:left-0 sm:top-[14%] sm:w-[23%]"
              />
              <img
                src={landingDashboardTablet}
                alt="Tampilan dashboard Rumi di tablet"
                className="absolute left-1/2 top-[10%] z-20 w-[88%] max-w-[780px] -translate-x-1/2 drop-shadow-2xl sm:top-[7%] sm:w-[78%]"
              />
              <img
                src={landingSettingsPhone}
                alt="Tampilan halaman pengaturan Rumi di ponsel"
                className="absolute right-[2%] top-[18%] z-30 w-[25%] rotate-6 drop-shadow-2xl sm:right-0 sm:top-[14%] sm:w-[23%]"
              />
            </div>
            <p className="mt-6 text-[10px] font-semibold tracking-[0.18em] text-[#6c8983] uppercase">
              Monitoring CCTV • Deteksi dan notifikasi dalam satu sistem
            </p>
          </div>
        </section>

        <section className="border-y border-[#dcebe7] bg-white px-4 py-16">
          <div className="mx-auto grid max-w-6xl gap-10 text-center md:grid-cols-3 md:text-left">
            {[
              ["Satu dashboard", "Kamera tersebar, konteks tetap utuh"],
              ["Tanpa sensor tubuh", "Manfaatkan kamera yang sudah tersedia"],
              ["Bukti yang jelas", "Snapshot, waktu, dan lokasi kejadian"],
            ].map(([title, text], index) => (
              <div key={title} className="relative md:pl-8">
                {index > 0 && (
                  <span className="absolute -left-5 top-0 hidden h-full w-px bg-white/10 md:block" />
                )}
                <p className="font-display text-2xl font-bold text-[#0d7166]">{title}</p>
                <p className="mt-2 text-sm text-[#6a8580]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="simulasi" className="relative scroll-mt-24 px-4 py-28 lg:py-36">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Simulasi yang transparan</SectionLabel>
              <h2 className="mt-6 text-4xl leading-tight font-bold sm:text-6xl">
                Kenali konteks, bukan sekadar alarm.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#63807a]">
                Saat indikasi muncul, pendamping membutuhkan tiga hal: apa yang terlihat, di ruangan
                mana, dan kapan terjadi.
              </p>
            </div>

            <div className="rumi-simulation-frame relative mx-auto mt-16 max-w-5xl overflow-hidden rounded-[2rem] border border-[#cfe3dd] bg-white p-2 sm:p-3">
              <div className="relative overflow-hidden rounded-[1.4rem]">
                <img
                  src={feedLivingRoom}
                  alt="Simulasi kamera ruang keluarga"
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/25" />
                <div className="rumi-detection-zone absolute bottom-[20%] right-[19%] h-[42%] w-[17%] rounded-xl border border-[#91f0d1]/70">
                  <span className="absolute -top-6 left-0 rounded-md bg-[#91f0d1] px-2 py-1 text-[8px] font-extrabold text-[#052e29]">
                    Gerakan · 87%
                  </span>
                </div>
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-bold backdrop-blur">
                  <span className="size-2 animate-pulse rounded-full bg-[#ff665d]" /> Live · Ruang
                  keluarga
                </div>
                <button
                  aria-label="Putar simulasi deteksi jatuh"
                  className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-transform hover:scale-105"
                >
                  <Play className="ml-1 size-6 fill-current" />
                </button>
                <div className="absolute inset-x-5 bottom-4 flex items-end justify-between">
                  <div>
                    <p className="text-sm font-bold">Simulasi pemantauan</p>
                    <p className="mt-1 text-[10px] text-white/50">Ruang keluarga · Cam 01</p>
                  </div>
                  <div className="flex gap-2">
                    <Wifi className="size-4" />
                    <Expand className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="scroll-mt-24 px-4 pb-28 lg:pb-36">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <SectionLabel>Yang Rumi satukan</SectionLabel>
                <h2 className="mt-6 text-4xl leading-tight font-bold sm:text-6xl">
                  Empat kebutuhan. Satu pandangan.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#63807a]">
                Didesain untuk keluarga dan caregiver yang perlu memantau beberapa ruang tanpa terus
                berpindah layar.
              </p>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((benefit, index) => (
                <article
                  key={benefit.title}
                  className={`group relative min-h-64 overflow-hidden rounded-[1.75rem] border p-6 shadow-[0_20px_60px_-42px_#0d7166] ${index === 1 ? "border-[#ff665d]/25 bg-[#fff3f1]" : "border-[#d6e8e3] bg-white"}`}
                >
                  <span
                    className={`flex size-11 items-center justify-center rounded-2xl ${index === 1 ? "bg-[#ff665d] text-white" : "bg-[#dff3ed] text-[#0d7166]"}`}
                  >
                    <benefit.icon className="size-5" />
                  </span>
                  <span className="absolute right-6 top-6 font-display text-xs font-bold text-[#0d7166]/20">
                    0{index + 1}
                  </span>
                  <div className="absolute inset-x-6 bottom-6">
                    <h3 className="text-xl font-bold">{benefit.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#63807a]">{benefit.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-y border-[#dcebe7] bg-[#edf9f5] px-4 py-28 lg:py-36">
          <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative">
              <div className="absolute -inset-16 bg-[radial-gradient(circle,#91f0d11a,transparent_65%)]" />
              <div className="relative">
                <img
                  src={landingDashboardTablet}
                  alt="Dashboard monitoring Rumi pada tablet"
                  className="w-full drop-shadow-2xl"
                  loading="lazy"
                />
              </div>
            </div>
            <div>
              <SectionLabel>Monitoring first</SectionLabel>
              <h2 className="mt-6 text-4xl leading-tight font-bold sm:text-5xl">
                Semua ruang terlihat dalam satu dashboard.
              </h2>
              <p className="mt-5 text-sm leading-6 text-[#63807a]">
                Grid multi-kamera mempertahankan rasio video, menampilkan lokasi, dan membedakan
                feed live, offline, atau belum dapat diputar browser.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  [Video, "Pantau feed"],
                  [MapPin, "Kenali lokasi"],
                  [Radio, "Lihat status"],
                  [Expand, "Buka fullscreen"],
                ].map(([Icon, label]) => {
                  const ItemIcon = Icon as typeof Video;
                  return (
                    <div
                      key={String(label)}
                      className="flex items-center gap-3 rounded-2xl border border-[#d3e6e0] bg-white p-4 text-sm font-bold shadow-sm"
                    >
                      <ItemIcon className="size-4 text-[#0d7166]" />
                      {String(label)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-28 lg:py-40">
          <div className="mx-auto max-w-6xl space-y-28">
            <div className="grid items-center gap-14 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <SectionLabel>Dari kamera ke notifikasi</SectionLabel>
                <h2 className="mt-6 text-4xl leading-tight font-bold sm:text-5xl">
                  Lokasi dan waktu tetap menempel pada kejadian.
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-6 text-[#63807a]">
                  Notifikasi tidak berdiri sendiri. Rumi menempatkan snapshot, kamera, dan waktu
                  dalam satu kartu agar konteks mudah dibaca.
                </p>
                <div className="mt-8 max-w-md rounded-2xl border border-[#ff665d]/25 bg-[#ff665d]/[0.07] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#ff665d] text-white">
                      <Siren className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#ff847d]">Simulasi indikasi jatuh</p>
                      <p className="mt-1 text-xs text-[#7b6a68]">Ruang keluarga · 10.24</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 overflow-hidden rounded-[2rem] border border-[#d3e6e0] bg-[#e8f7f2] p-3 lg:order-2">
                <img
                  src={landingFallDetection}
                  alt="Deteksi jatuh dengan pose estimation dari kamera CCTV"
                  className="aspect-[4/3] w-full rounded-[1.4rem] object-cover"
                />
              </div>
            </div>

            <div className="grid items-center gap-14 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-[#d3e6e0] bg-[#e8f7f2] p-3">
                <div className="overflow-hidden rounded-[1.4rem] bg-[#f3faf7] text-[#0a3934]">
                  <BrowserBar path="riwayat" />
                  <div className="p-5 sm:p-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-extrabold">Riwayat kejadian</p>
                        <p className="text-[9px] text-[#66807b]">
                          Snapshot berdasarkan waktu dan lokasi
                        </p>
                      </div>
                      <ListFilter className="size-5 text-[#0d7166]" />
                    </div>
                    <div className="mt-5 space-y-2">
                      {[
                        [fallSnapshot, "Indikasi jatuh", "Ruang keluarga", "10.24", true],
                        [feedKitchen, "Gerakan terdeteksi", "Ruang makan", "09.17", false],
                        [feedBedroom, "Gerakan terdeteksi", "Kamar utama", "08.53", false],
                      ].map(([image, title, location, time, alert]) => (
                        <div
                          key={String(time)}
                          className={`grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-xl p-2.5 ${alert ? "bg-[#ffe3e0]" : "bg-white"}`}
                        >
                          <img
                            src={String(image)}
                            alt=""
                            className="h-11 w-full rounded-lg object-cover"
                          />
                          <div>
                            <p
                              className={`text-[10px] font-extrabold ${alert ? "text-[#d43d37]" : ""}`}
                            >
                              {String(title)}
                            </p>
                            <p className="mt-1 text-[8px] text-[#66807b]">{String(location)}</p>
                          </div>
                          <span className="text-[9px] font-bold text-[#66807b]">
                            {String(time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <SectionLabel>Bukti, bukan workflow</SectionLabel>
                <h2 className="mt-6 text-4xl leading-tight font-bold sm:text-5xl">
                  Tinjau kembali tanpa status yang membingungkan.
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-6 text-[#63807a]">
                  Riwayat berfokus pada apa yang terekam: snapshot, waktu, lokasi, dan durasi
                  klip—tanpa klaim bahwa insiden telah ditangani.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-8 rounded-full border-[#c9dfd9] bg-white px-6 text-[#0a3934] hover:bg-[#e8f7f2] hover:text-[#0d7166]"
                >
                  <Link to="/riwayat">
                    Buka riwayat <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section
          id="cara-kerja"
          className="scroll-mt-24 border-y border-[#dcebe7] bg-white px-4 py-28 lg:py-36"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Alur sederhana</SectionLabel>
              <h2 className="mt-6 text-4xl leading-tight font-bold sm:text-6xl">
                Dari kamera rumah ke bukti kejadian.
              </h2>
            </div>
            <ol className="relative mt-16 grid gap-4 md:grid-cols-4">
              <div className="rumi-step-line absolute left-[12%] right-[12%] top-7 hidden h-px md:block" />
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative rounded-[1.75rem] border border-[#d6e8e3] bg-[#f8fcfa] p-6 shadow-[0_20px_60px_-45px_#0d7166]"
                >
                  <span className="relative z-10 flex size-14 items-center justify-center rounded-full border border-[#0d7166]/15 bg-[#dff3ed] text-[#0d7166]">
                    <step.icon className="size-5" />
                  </span>
                  <p className="mt-12 text-[10px] font-bold tracking-[0.16em] text-[#0d7166]/40 uppercase">
                    Langkah {index + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#63807a]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 py-28 lg:py-36">
          <div className="rumi-honesty relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#cfe3dd] bg-[#eaf7f3] p-7 sm:p-12 lg:p-16">
            <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <SectionLabel>Dibangun dengan jujur</SectionLabel>
                <h2 className="mt-6 max-w-3xl text-4xl leading-tight font-bold sm:text-6xl">
                  Rumi membantu melihat. Manusia tetap memutuskan.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-[#63807a]">
                  Rumi bukan perangkat medis, diagnosis klinis, atau layanan darurat. Sistem ini
                  membantu menyatukan monitoring dan notifikasi agar informasi lebih mudah dipahami.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  "Deteksi masih berupa simulasi frontend",
                  "RTSP memerlukan media gateway",
                  "Data kamera lokal tersimpan di browser",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-[#d2e5df] bg-white/75 p-4 text-sm text-[#456b64]"
                  >
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#0d7166]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 px-4 pb-28 lg:pb-36">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionLabel>Pertanyaan penting</SectionLabel>
              <h2 className="mt-6 text-4xl leading-tight font-bold sm:text-5xl">
                Kenali Rumi sebelum mencoba.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-[#63807a]">
                Semua jawaban diselaraskan dengan kemampuan aktual proyek, bukan janji pemasaran.
              </p>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map((faq, index) => (
                <AccordionItem
                  key={faq.q}
                  value={`item-${index}`}
                  className="rounded-2xl border border-[#d6e8e3] bg-white px-5 shadow-sm"
                >
                  <AccordionTrigger className="text-left text-base font-bold text-[#0a3934] hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pr-8 text-sm leading-6 text-[#63807a]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="rumi-final-cta relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#cfe3dd] px-6 py-20 text-center sm:px-12 sm:py-24">
            <div className="relative z-10">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#0d7166]/15 bg-white text-[#0d7166] shadow-sm">
                <House className="size-6" />
              </span>
              <h2 className="mx-auto mt-7 max-w-3xl text-4xl leading-tight font-bold sm:text-6xl">
                Lihat rumah dari sudut yang lebih tenang.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#63807a]">
                Masuk ke Rumi, tambahkan kamera Anda, dan kelola alur monitoring dari satu
                dashboard.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-[#0d7166] px-7 font-extrabold text-white hover:bg-[#095e55]"
                >
                  <Link to="/login">
                    Masuk ke Rumi <ChevronRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-[#bfd8d1] bg-white/65 px-7 font-bold text-[#0a3934] hover:bg-white hover:text-[#0d7166]"
                >
                  <Link to="/register">Buat akun</Link>
                </Button>
              </div>
              <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[#63807a]">
                {["Tanpa sensor tubuh", "Dukungan multi-kamera", "Fullscreen kamera"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-[#0d7166]" />
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dcebe7] bg-white px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <div>
            <BrandLogo imageClassName="size-9" textClassName="text-[#0d7166]" />
            <p className="mt-3 max-w-sm text-xs leading-5 text-[#78918c]">
              Sistem monitoring CCTV dan notifikasi indikasi jatuh.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-[#63807a]">
            <a href="#fitur" className="hover:text-[#0d7166]">
              Fitur
            </a>
            <a href="#cara-kerja" className="hover:text-[#0d7166]">
              Cara kerja
            </a>
            <a href="#faq" className="hover:text-[#0d7166]">
              FAQ
            </a>
            <Link to="/login" className="hover:text-[#0d7166]">
              Login
            </Link>
          </div>
          <p className="text-xs text-[#78918c]">© 2026 Rumi</p>
        </div>
      </footer>
    </div>
  );
}
