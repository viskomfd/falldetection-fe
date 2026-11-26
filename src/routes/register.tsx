import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BrainCircuit, Eye, EyeOff, Loader2, Siren } from "lucide-react";
import { useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { saveElderlyName } from "@/lib/elderly-profile";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Rumi | Buat Akun Baru" },
      {
        name: "description",
        content:
          "Daftar Rumi dan mulai lindungi orang tersayang dengan deteksi jatuh real-time berbasis AI.",
      },
      { property: "og:title", content: "Rumi | Buat Akun Baru" },
      {
        property: "og:description",
        content:
          "Daftar Rumi dan mulai lindungi orang tersayang dengan deteksi jatuh real-time berbasis AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [elderlyName, setElderlyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedElderlyName = elderlyName.trim();
    if (!trimmedElderlyName) {
      setErrorMessage("Nama lansia harus diisi.");
      return;
    }

    setLoading(true);

    try {
      await authApi.register({ name, email, password });
      try {
        await saveElderlyName(trimmedElderlyName);
        void navigate({ to: "/dashboard" });
      } catch {
        void navigate({ to: "/setup-lansia" });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Pendaftaran gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Mobile brand header */}
      <header className="flex items-center justify-between bg-primary px-5 py-4 text-primary-foreground lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo
            src="/icon-white.png"
            imageClassName="size-9"
            textClassName="text-xl text-primary-foreground"
          />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-white/20"
        >
          <ArrowLeft className="size-3.5" />
          Beranda
        </Link>
      </header>

      {/* Brand panel */}
      <aside className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:h-full lg:w-1/2 xl:p-14">
        <Link to="/" className="flex w-fit items-center gap-2">
          <BrandLogo
            src="/icon-white.png"
            imageClassName="size-12"
            textClassName="text-2xl text-primary-foreground"
          />
        </Link>
        <div className="w-full max-w-md">
          <h2 className="text-3xl leading-tight font-bold xl:text-4xl">
            Buat akun dan mulai pantau dalam beberapa menit.
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-3">
              <BrainCircuit className="size-5 shrink-0" />
              Tanpa perangkat baru | gunakan kamera CCTV yang sudah ada
            </li>
            <li className="flex items-center gap-3">
              <Siren className="size-5 shrink-0" />
              Alert real-time ke seluruh pendamping yang Anda daftarkan
            </li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/50">
          © 2026 Rumi · Sistem Deteksi Jatuh &amp; Monitoring CCTV
        </p>
      </aside>

      {/* Form */}
      <main className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 sm:py-10 lg:h-full lg:w-1/2 lg:px-10">
        <div className="m-auto w-full max-w-md">
          <Button
            asChild
            variant="ghost"
            className="-ml-2 mb-5 hidden rounded-full text-muted-foreground lg:inline-flex"
          >
            <Link to="/">
              <ArrowLeft className="size-4" />
              Kembali ke beranda
            </Link>
          </Button>

          <div className="card-shadow rounded-3xl bg-card p-6 sm:rounded-4xl sm:p-8">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Daftar</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Buat akun Rumi untuk Anda dan orang tersayang.
            </p>

            {errorMessage && (
              <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  placeholder="Nama Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-2xl bg-background px-4 py-5"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="elderly-name">Nama Lansia</Label>
                <Input
                  id="elderly-name"
                  type="text"
                  required
                  placeholder="Contoh: Ibu Siti"
                  value={elderlyName}
                  onChange={(e) => setElderlyName(e.target.value)}
                  className="rounded-2xl bg-background px-4 py-5"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl bg-background px-4 py-5"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-2xl bg-background px-4 py-5 pr-12"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                className="mt-1 rounded-full font-semibold"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {loading ? "Mendaftarkan..." : "Buat Akun"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Dengan mendaftar, Anda menyetujui syarat layanan dan kebijakan privasi Rumi.
              </p>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
