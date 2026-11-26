import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  BellRing,
  Camera,
  Check,
  ChevronRight,
  Download,
  Expand,
  Eye,
  History,
  MapPin,
  Pause,
  Play,
  Radio,
  Share,
  ShieldCheck,
  Siren,
  Smartphone,
  Video,
} from "lucide-react";

import fallSnapshot from "@/assets/fall-snapshot.jpg";
import feedBedroom from "@/assets/feed-bedroom.jpg";
import feedKitchen from "@/assets/feed-kitchen.jpg";
import landingCameraPhone from "@/assets/landing-camera-phone.png";
import landingDashboardTablet from "@/assets/landing-dashboard-tablet.png";
import landingFallDetection from "@/assets/landing-fall-detection.png";
import landingFallSimulation from "@/assets/landing-fall-simulation.mp4";
import landingSettingsPhone from "@/assets/landing-settings-phone.png";
import { BrandLogo } from "@/components/brand-logo";
import { HeroIsometricHome } from "@/components/hero-isometric-home";

const Hero3DScene = lazy(() =>
  import("@/components/hero-3d-scene").then((mod) => ({ default: mod.Hero3DScene })),
);
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePwaInstall } from "@/lib/pwa-install";

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

type FeatureTab = "pantau" | "notifikasi" | "riwayat";

const WORKFLOW_STEPS = [
  { icon: Camera, title: "Hubungkan kamera", detail: "IP camera HTTP/RTSP atau kamera HP" },
  { icon: Eye, title: "Pantau ruang", detail: "Grid multi-kamera dari satu layar" },
  { icon: Siren, title: "Terima alert", detail: "Lokasi, waktu, dan alarm langsung" },
  { icon: History, title: "Tinjau bukti", detail: "Snapshot dan klip sekitar insiden" },
];

const FAQS = [
  {
    q: "Apakah Rumi sudah mendeteksi jatuh secara nyata?",
    a: "Ya. Rumi memproses stream CCTV melalui model deteksi jatuh di backend, serta mendukung deteksi langsung di browser untuk kamera perangkat menggunakan YOLO11-Pose ONNX. Akurasi tetap dipengaruhi kualitas video, sudut kamera, pencahayaan, dan jaringan.",
  },
  {
    q: "Kamera apa yang dapat ditambahkan?",
    a: "Rumi menerima URL HTTP, HTTPS, dan RTSP, atau langsung memakai kamera HP/laptop di browser. HTTP/MJPEG dapat diputar langsung jika jaringan dan browser mengizinkan, sedangkan RTSP memerlukan media gateway agar dapat diputar di browser.",
  },
  {
    q: "Apakah Rumi menggantikan pendamping atau layanan darurat?",
    a: "Tidak. Rumi diposisikan sebagai alat bantu monitoring dan notifikasi, bukan perangkat medis, diagnosis klinis, atau layanan dispatch darurat.",
  },
  {
    q: "Di mana data kamera dan riwayat disimpan?",
    a: "Data kamera, profil lansia, dan riwayat insiden dikelola melalui backend Rumi agar tetap tersedia saat akun dibuka dari perangkat lain.",
  },
];

function Landing() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const simVideoRef = useRef<HTMLVideoElement | null>(null);
  const [activeTab, setActiveTab] = useState<FeatureTab>("pantau");
  const [videoPlaying, setVideoPlaying] = useState(true);
  const { isInstalled, triggerInstall } = usePwaInstall();
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [installHint, setInstallHint] = useState("");
  const [isDesktopHero, setIsDesktopHero] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktopHero(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  async function handleInstallPwa() {
    setInstallHint("");
    const outcome = await triggerInstall();
    if (outcome === "ios-guide") {
      setIosGuideOpen(true);
    } else if (outcome === "manual-hint") {
      setInstallHint(
        "Buka menu browser Anda lalu pilih 'Install App' / 'Tambah ke Layar Utama' untuk memasang aplikasi Rumi.",
      );
    }
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    root.classList.add("rumi-motion-ready");
    const targets = Array.from(root.querySelectorAll<HTMLElement>(".rumi-reveal"));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-visible", "true");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );

    for (const el of targets) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = simVideoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && videoPlaying) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [videoPlaying]);

  function handleToggleVideo() {
    const video = simVideoRef.current;
    if (!video) return;
    if (video.paused) {
      setVideoPlaying(true);
      void video.play().catch(() => undefined);
    } else {
      setVideoPlaying(false);
      video.pause();
    }
  }

  return (
    <div ref={rootRef} className="rumi-night min-h-dvh overflow-x-clip bg-[#f7fbf9] text-[#0a3934]">
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3">
        <nav
          aria-label="Navigasi utama"
          className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-[#d8e9e4] bg-white/95 px-3 py-2 shadow-[0_10px_30px_-22px_#0d716680] backdrop-blur-md sm:px-5 md:grid md:grid-cols-[1fr_auto_1fr]"
        >
          <a href="#beranda" aria-label="Rumi, kembali ke beranda" className="justify-self-start">
            <BrandLogo imageClassName="size-8" textClassName="text-[#0d7166]" />
          </a>
          <div className="hidden items-center justify-self-center gap-7 text-sm font-semibold text-[#335952] md:flex">
            <a href="#simulasi" className="transition-colors hover:text-[#0d7166]">
              Simulasi
            </a>
            <a href="#fitur" className="transition-colors hover:text-[#0d7166]">
              Fitur
            </a>
            <a href="#faq" className="transition-colors hover:text-[#0d7166]">
              FAQ
            </a>
          </div>
          <div className="flex items-center justify-self-end gap-2">
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
        {/* 1. HERO — FULL-BLEED LOW-POLY SCENE ON DESKTOP, UNCHANGED ON MOBILE */}
        <section id="beranda" className="rumi-night-hero relative min-h-dvh overflow-hidden">
          {/* Desktop (lg+): Full-bleed 3D low-poly living room with Sitting -> Walk -> Fall animation */}
          <div className="relative hidden min-h-dvh items-center lg:flex">
            {isDesktopHero && (
              <Suspense fallback={<div className="absolute inset-0 bg-[#f3f8f6]" />}>
                <Hero3DScene />
              </Suspense>
            )}
            <div className="relative z-20 mx-auto w-full max-w-6xl px-4 py-24">
              <div className="max-w-xl text-left">
                <h1 className="text-[3.05rem] leading-[1.06] font-bold tracking-[-0.04em] text-[#0a3934]">
                  <span className="block">Deteksi jatuh nyata</span>
                  <span className="block whitespace-nowrap text-[#0d7166]">
                    Lewat CCTV atau kamera HP
                  </span>
                </h1>
                <p className="mt-5 max-w-md text-lg leading-7 text-[#264b44]">
                  Pantau keselamatan lansia di rumah lewat CCTV atau kamera perangkat, dan terima
                  notifikasi jatuh dari satu dashboard.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full bg-[#0d7166] px-7 font-extrabold text-white shadow-md shadow-[#0d7166]/15 hover:bg-[#095e55]"
                  >
                    <a href="#simulasi">
                      <Play className="size-4 fill-current" /> Lihat simulasi
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full border-[#c9dfd9] bg-white/95 px-7 font-bold text-[#0a3934] hover:bg-[#e8f7f2] hover:text-[#0d7166]"
                  >
                    <Link to="/login">Coba Rumi</Link>
                  </Button>
                  {!isInstalled && (
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => void handleInstallPwa()}
                      className="rounded-full border-[#0d7166]/35 bg-[#e8f7f2]/95 px-6 font-bold text-[#0d7166] hover:bg-[#d5efe6]"
                    >
                      <Download className="size-4" /> Install Aplikasi
                    </Button>
                  )}
                </div>
                {installHint && (
                  <p role="status" className="mt-3 max-w-md text-xs font-medium text-[#264b44]">
                    {installHint}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mobile & Tablet (< lg): Kept unchanged */}
          <div className="relative z-10 flex min-h-dvh flex-col justify-between px-4 pb-6 pt-24 lg:hidden">
            <div className="mx-auto my-auto grid w-full max-w-6xl items-center gap-8 py-4">
              <div className="text-center">
                <h1 className="text-[2.15rem] leading-[1.06] font-bold tracking-[-0.04em] sm:text-5xl">
                  <span className="block">Deteksi jatuh nyata</span>
                  <span className="block text-[#0d7166]">Lewat CCTV atau kamera HP</span>
                </h1>
                <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-[#335952] sm:text-lg">
                  Pantau keselamatan lansia di rumah lewat CCTV atau kamera perangkat, dan terima
                  notifikasi jatuh dari satu dashboard.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full bg-[#0d7166] px-7 font-extrabold text-white shadow-md shadow-[#0d7166]/15 hover:bg-[#095e55]"
                  >
                    <a href="#simulasi">
                      <Play className="size-4 fill-current" /> Lihat simulasi
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full border-[#c9dfd9] bg-white px-7 font-bold text-[#0a3934] hover:bg-[#e8f7f2] hover:text-[#0d7166]"
                  >
                    <Link to="/login">Coba Rumi</Link>
                  </Button>
                  {!isInstalled && (
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => void handleInstallPwa()}
                      className="rounded-full border-[#0d7166]/35 bg-[#e8f7f2] px-6 font-bold text-[#0d7166] hover:bg-[#d5efe6]"
                    >
                      <Download className="size-4" /> Install Aplikasi
                    </Button>
                  )}
                </div>
                {installHint && (
                  <p
                    role="status"
                    className="mx-auto mt-3 max-w-lg text-xs font-medium text-[#335952]"
                  >
                    {installHint}
                  </p>
                )}
              </div>

              <div>
                <HeroIsometricHome />
              </div>
            </div>

            <div className="mx-auto mt-6 grid w-full max-w-6xl gap-3 sm:grid-cols-3">
              {[
                [
                  "CCTV & kamera HP",
                  "Gunakan IP camera rumah atau kamera perangkat langsung di browser",
                ],
                [
                  "Deteksi pose tubuh",
                  "Analisis pose YOLO11 untuk mengenali indikasi jatuh tanpa sensor tubuh",
                ],
                [
                  "Bukti & notifikasi",
                  "Snapshot, lokasi ruangan, alarm suara, dan klip singkat tersimpan rapi",
                ],
              ].map(([title, desc]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-[#d8e9e4] bg-white/85 px-5 py-4 text-left"
                >
                  <p className="font-display text-sm font-bold text-[#0d7166] sm:text-base">
                    {title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#335952] sm:text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. SIMULASI & KONTEKS ALERT */}
        <section id="simulasi" className="scroll-mt-20 bg-white px-4 py-14 lg:py-20">
          <div className="rumi-reveal mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-12">
            <div>
              <div className="rumi-simulation-frame relative overflow-hidden rounded-3xl border border-[#cfe3dd] bg-[#f7fbf9] p-2">
                <video
                  ref={simVideoRef}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={landingFallDetection}
                  width={1280}
                  height={720}
                  onTimeUpdate={(event) => {
                    const video = event.currentTarget;
                    if (video.currentTime >= 10) {
                      video.currentTime = 0;
                    }
                  }}
                  className="aspect-video w-full rounded-2xl bg-black object-cover"
                  aria-label="Video simulasi deteksi jatuh Rumi"
                >
                  <source src={landingFallSimulation} type="video/mp4" />
                  Browser Anda tidak mendukung pemutar video.
                </video>
                <button
                  type="button"
                  onClick={handleToggleVideo}
                  className="absolute bottom-4 right-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0a3934]/85 px-3.5 py-1.5 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#0d7166] active:scale-[0.97] motion-reduce:active:scale-100"
                >
                  {videoPlaying ? (
                    <>
                      <Pause className="size-3.5" aria-hidden="true" /> Jeda
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" aria-hidden="true" /> Putar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-3xl leading-tight font-bold sm:text-4xl">
                Kenali konteks, bukan sekadar alarm
              </h2>
              <p className="mt-3 text-base leading-6 text-[#335952]">
                Saat indikasi jatuh muncul, Rumi menyatukan pose tubuh, nama ruangan, dan waktu
                kejadian agar pendamping langsung tahu apa yang perlu diperiksa.
              </p>

              <div className="mt-5 rounded-2xl border border-[#f5c2be] bg-[#fff3f2] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#d43d37] text-white">
                    <Siren className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#b91c1c]">Indikasi jatuh terdeteksi</p>
                    <p className="text-xs font-medium text-[#7f1d1d]">
                      Ruang keluarga, Kamera 03, 10:24 WIB
                    </p>
                  </div>
                </div>
              </div>

              <ul className="mt-5 space-y-2 text-sm text-[#335952]">
                {[
                  "Deteksi pose tubuh di backend CCTV atau lokal via YOLO11-Pose ONNX",
                  "Lokasi ruangan dan waktu selalu menempel pada setiap alert",
                  "Snapshot dan klip sekitar insiden langsung tersimpan ke riwayat",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#0d7166]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 3. FITUR & ALUR (TABBED SHOWCASE) */}
        <section
          id="fitur"
          className="scroll-mt-20 border-y border-[#dcebe7] bg-[#edf9f5] px-4 py-14 lg:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <h2 className="text-3xl leading-tight font-bold sm:text-4xl">
                  Satu alur pantau dari kamera ke bukti
                </h2>
                <p className="mt-2 max-w-xl text-base text-[#335952]">
                  Didesain untuk keluarga dan caregiver agar memantau ruang, mengatur peringatan,
                  dan memeriksa riwayat tanpa berpindah aplikasi.
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Pilih tampilan fitur Rumi"
                className="inline-flex w-fit rounded-full border border-[#cfe3dd] bg-white p-1"
              >
                {(
                  [
                    ["pantau", "Pantau Ruang"],
                    ["notifikasi", "Notifikasi"],
                    ["riwayat", "Riwayat"],
                  ] as const
                ).map(([key, label]) => {
                  const selected = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveTab(key)}
                      className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-[color,background-color,transform] duration-200 active:scale-[0.97] motion-reduce:active:scale-100 ${
                        selected ? "bg-[#0d7166] text-white" : "text-[#335952] hover:text-[#0a3934]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rumi-reveal mt-8 rounded-3xl border border-[#d3e6e0] bg-white p-5 sm:p-8 lg:flex lg:h-[440px] lg:items-center">
              <div key={activeTab} className="rumi-tab-enter w-full">
                {activeTab === "pantau" && (
                  <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="flex h-[240px] items-center justify-center rounded-2xl bg-[#f4faf7] p-4 sm:h-[340px] sm:p-6 lg:h-[368px]">
                      <img
                        src={landingDashboardTablet}
                        alt="Dashboard monitoring multi-kamera Rumi pada tablet"
                        width={1400}
                        height={980}
                        loading="lazy"
                        className="max-h-full w-auto max-w-full rounded-xl object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Semua ruang terlihat dalam satu grid</h3>
                      <p className="mt-3 text-sm leading-6 text-[#335952]">
                        Grid multi-kamera mempertahankan rasio video, menampilkan nama ruangan,
                        serta membedakan status live, offline, atau kamera perangkat lokal.
                      </p>
                      <div className="mt-5 grid grid-cols-2 gap-2.5">
                        {[
                          [Video, "Pantau feed live"],
                          [MapPin, "Label lokasi ruang"],
                          [Radio, "Status koneksi"],
                          [Expand, "Mode fullscreen"],
                        ].map(([Icon, label]) => {
                          const ItemIcon = Icon as typeof Video;
                          return (
                            <div
                              key={String(label)}
                              className="flex items-center gap-2.5 rounded-xl border border-[#dcebe7] bg-[#f7fbf9] px-3.5 py-3 text-sm font-semibold text-[#0a3934]"
                            >
                              <ItemIcon
                                className="size-4 shrink-0 text-[#0d7166]"
                                aria-hidden="true"
                              />
                              <span>{String(label)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "notifikasi" && (
                  <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="flex h-[240px] items-center justify-center gap-4 rounded-2xl bg-[#f4faf7] p-4 sm:h-[340px] sm:p-6 lg:h-[368px]">
                      <img
                        src={landingCameraPhone}
                        alt="Halaman kamera Rumi di ponsel"
                        width={720}
                        height={1440}
                        loading="lazy"
                        className="max-h-full w-auto object-contain"
                      />
                      <img
                        src={landingSettingsPhone}
                        alt="Halaman pengaturan notifikasi dan profil lansia Rumi di ponsel"
                        width={720}
                        height={1440}
                        loading="lazy"
                        className="max-h-full w-auto object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">
                        Profil lansia dan alarm sesuai kebutuhan
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-[#335952]">
                        Atur nama lansia yang dipantau dan pilih kanal peringatan yang aktif di
                        perangkat pendamping, termasuk dukungan PWA untuk notifikasi latar belakang.
                      </p>
                      <div className="mt-5 space-y-2.5">
                        {[
                          ["Pop-up Fall Alert", "Banner peringatan segera muncul di dashboard"],
                          ["Alarm Suara", "Bunyikan peringatan audio saat indikasi jatuh diterima"],
                          [
                            "Notifikasi Browser & PWA",
                            "Tetap menerima notifikasi saat tab tidak aktif",
                          ],
                        ].map(([title, desc]) => (
                          <div
                            key={title}
                            className="flex items-start gap-3 rounded-xl border border-[#dcebe7] bg-[#f7fbf9] px-4 py-3"
                          >
                            <BellRing
                              className="mt-0.5 size-4 shrink-0 text-[#0d7166]"
                              aria-hidden="true"
                            />
                            <div>
                              <p className="text-sm font-bold text-[#0a3934]">{title}</p>
                              <p className="text-xs text-[#335952]">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "riwayat" && (
                  <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="flex h-[240px] flex-col justify-center gap-2.5 rounded-2xl bg-[#f4faf7] p-4 sm:h-[340px] sm:p-6 lg:h-[368px]">
                      {[
                        [
                          fallSnapshot,
                          "Indikasi jatuh",
                          "Ruang keluarga, Kamera 03",
                          "10:24 WIB",
                          true,
                        ],
                        [feedKitchen, "Gerakan terdeteksi", "Dapur, Kamera 02", "09:17 WIB", false],
                        [
                          feedBedroom,
                          "Gerakan terdeteksi",
                          "Kamar utama, Kamera 01",
                          "08:53 WIB",
                          false,
                        ],
                      ].map(([image, title, location, time, alert]) => (
                        <div
                          key={String(time)}
                          className={`grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 rounded-xl p-2.5 ${
                            alert ? "border border-[#f5c2be] bg-[#fff3f2]" : "bg-white"
                          }`}
                        >
                          <img
                            src={String(image)}
                            alt=""
                            width={320}
                            height={180}
                            loading="lazy"
                            className="h-14 w-full rounded-lg object-cover"
                          />
                          <div>
                            <p
                              className={`text-sm font-bold ${
                                alert ? "text-[#b91c1c]" : "text-[#0a3934]"
                              }`}
                            >
                              {String(title)}
                            </p>
                            <p className="text-xs text-[#335952]">{String(location)}</p>
                          </div>
                          <span className="text-xs font-semibold text-[#335952]">
                            {String(time)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">
                        Tinjau bukti tanpa status membingungkan
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-[#335952]">
                        Riwayat berfokus pada bukti yang benar-benar terekam: snapshot, waktu,
                        lokasi ruangan, dan klip singkat sekitar kejadian agar mudah diverifikasi
                        ulang.
                      </p>
                      <Button
                        asChild
                        variant="outline"
                        className="mt-5 rounded-full border-[#c9dfd9] bg-white px-5 font-semibold text-[#0a3934] hover:bg-[#e8f7f2] hover:text-[#0d7166]"
                      >
                        <Link to="/riwayat">
                          Buka riwayat <ChevronRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {WORKFLOW_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  style={{ "--reveal-delay": `${index * 50}ms` } as CSSProperties}
                  className="rumi-reveal flex items-start gap-3 rounded-2xl border border-[#d6e8e3] bg-white px-4 py-3.5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#dff3ed] text-[#0d7166]">
                    <step.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#0a3934]">{step.title}</p>
                    <p className="mt-0.5 text-xs text-[#335952]">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. FAQ & CATATAN TRANSPARANSI */}
        <section id="faq" className="scroll-mt-20 px-4 py-14 lg:py-20">
          <div className="rumi-reveal mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div className="rounded-3xl border border-[#cfe3dd] bg-[#eaf7f3] p-6 sm:p-7">
              <h2 className="text-2xl leading-tight font-bold sm:text-3xl">
                Rumi membantu melihat, manusia tetap memutuskan
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#335952]">
                Rumi bukan perangkat medis, diagnosis klinis, atau layanan darurat. Sistem ini
                membantu menyatukan pemantauan dan notifikasi agar kondisi lebih cepat dikenali.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "CCTV diproses di backend; kamera perangkat berjalan lokal via YOLO11-Pose ONNX",
                  "Stream RTSP memerlukan media gateway agar dapat diputar di browser",
                  "Pencahayaan, sudut kamera, dan koneksi jaringan memengaruhi deteksi",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-xl bg-white/85 px-3.5 py-2.5 text-xs leading-5 font-medium text-[#24524b]"
                  >
                    <ShieldCheck
                      className="mt-0.5 size-4 shrink-0 text-[#0d7166]"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl leading-tight font-bold sm:text-3xl">
                Pertanyaan sebelum mencoba
              </h2>
              <Accordion type="single" collapsible className="mt-5 space-y-2.5">
                {FAQS.map((faq, index) => (
                  <AccordionItem
                    key={faq.q}
                    value={`item-${index}`}
                    className="rounded-2xl border border-[#d6e8e3] bg-white px-5"
                  >
                    <AccordionTrigger className="py-4 text-left text-sm font-bold text-[#0a3934] hover:no-underline sm:text-base">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-6 text-[#335952]">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* 5. COMPACT FINAL CTA */}
        <section className="px-4 pb-12">
          <div className="rumi-reveal rumi-final-cta mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-3xl border border-[#cfe3dd] px-6 py-10 text-center sm:px-10 sm:py-12 lg:flex-row lg:text-left">
            <div className="max-w-xl">
              <h2 className="text-2xl leading-tight font-bold sm:text-4xl">
                Lihat rumah dari sudut yang lebih tenang
              </h2>
              <p className="mt-2.5 text-sm leading-6 text-[#335952] sm:text-base">
                Masuk ke Rumi, tambahkan kamera Anda, dan kelola alur monitoring dari satu
                dashboard.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
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
                className="rounded-full border-[#bfd8d1] bg-white px-7 font-bold text-[#0a3934] hover:bg-[#e8f7f2] hover:text-[#0d7166]"
              >
                <Link to="/register">Buat akun</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0f4d46] bg-[#0a3934] text-[#e6f4f0]">
        <div className="mx-auto max-w-6xl px-5 pt-10 pb-7 sm:px-6 sm:pt-12 sm:pb-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <a
                href="#beranda"
                aria-label="Rumi, kembali ke beranda"
                className="inline-flex items-center gap-2"
              >
                <BrandLogo
                  src="/icon-white.png"
                  imageClassName="size-8 sm:size-9"
                  textClassName="text-lg text-white sm:text-xl"
                />
              </a>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#b9dad2]">
                Platform pemantauan CCTV rumah dan deteksi indikasi jatuh secara real-time untuk
                membantu keluarga menjaga orang tersayang dengan lebih tenang.
              </p>
              <p className="mt-3 max-w-md rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-[#9ac2b9]">
                Alat bantu pemantauan rumah tangga, bukan perangkat medis atau layanan darurat.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 lg:col-span-6 lg:gap-8">
              <div>
                <h3 className="text-xs font-bold tracking-wider text-white/60 uppercase">
                  Navigasi
                </h3>
                <ul className="mt-3 space-y-2 text-sm font-medium text-[#d2ebe5]">
                  <li>
                    <a href="#beranda" className="transition-colors hover:text-white">
                      Beranda
                    </a>
                  </li>
                  <li>
                    <a href="#simulasi" className="transition-colors hover:text-white">
                      Simulasi
                    </a>
                  </li>
                  <li>
                    <a href="#fitur" className="transition-colors hover:text-white">
                      Fitur
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="transition-colors hover:text-white">
                      FAQ
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold tracking-wider text-white/60 uppercase">
                  Aplikasi
                </h3>
                <ul className="mt-3 space-y-2 text-sm font-medium text-[#d2ebe5]">
                  <li>
                    <Link to="/login" className="transition-colors hover:text-white">
                      Masuk
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="transition-colors hover:text-white">
                      Buat Akun
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className="transition-colors hover:text-white">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/riwayat" className="transition-colors hover:text-white">
                      Riwayat Insiden
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-5 text-center text-xs text-[#9ac2b9] sm:flex-row sm:text-left">
            <p>© 2026 Rumi. Hak cipta dilindungi.</p>
            <p>Sistem Deteksi Jatuh &amp; Monitoring CCTV Rumah</p>
          </div>
        </div>
      </footer>

      <Dialog open={iosGuideOpen} onOpenChange={setIosGuideOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="size-5 text-primary" />
              Install Rumi di iPhone / iPad
            </DialogTitle>
            <DialogDescription>
              Pasang Rumi di Layar Utama agar bisa login langsung dari aplikasi dan menerima
              notifikasi darurat 24/7 meski browser ditutup.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-3 rounded-2xl bg-muted p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <span>
                Ketuk ikon <Share className="mx-0.5 inline size-4 align-text-bottom text-primary" />{" "}
                <strong>Share</strong> di bilah bawah Safari.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-2xl bg-muted p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <span>
                Pilih <strong>Add to Home Screen</strong> (<em>Tambah ke Layar Utama</em>), lalu
                buka ikon <strong>Rumi</strong> dan login untuk mengaktifkan notifikasi 24/7.
              </span>
            </li>
          </ol>
          <DialogFooter>
            <Button type="button" className="rounded-full" onClick={() => setIosGuideOpen(false)}>
              Mengerti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
