import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BrainCircuit, Loader2, Siren } from "lucide-react";
import { useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { getElderlyName } from "@/lib/elderly-profile";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Rumi | Masuk ke Akun Anda" },
      {
        name: "description",
        content: "Masuk ke dashboard Rumi untuk memantau kamera dan menerima fall alert real-time.",
      },
      { property: "og:title", content: "Rumi | Masuk ke Akun Anda" },
      {
        property: "og:description",
        content: "Masuk ke dashboard Rumi untuk memantau kamera dan menerima fall alert real-time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      await authApi.login({ email, password });
      void navigate({ to: getElderlyName() ? "/dashboard" : "/setup-lansia" });
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal masuk. Periksa kembali email dan kata sandi Anda.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo
            src="/icon-white.png"
            imageClassName="size-12"
            textClassName="text-2xl text-primary-foreground"
          />
        </Link>
        <div>
          <h2 className="max-w-md text-4xl leading-tight font-bold">
            Selamat datang kembali. Orang tersayang Anda tetap dalam pantauan.
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-3">
              <BrainCircuit className="size-5 shrink-0" />
              AI memantau seluruh kamera 24/7
            </li>
            <li className="flex items-center gap-3">
              <Siren className="size-5 shrink-0" />
              Fall alert terkirim rata-rata 2,4 detik
            </li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/50">
          © 2026 Rumi · Sistem Deteksi Jatuh &amp; Monitoring CCTV
        </p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Button asChild variant="ghost" className="-ml-2 mb-6 rounded-full text-muted-foreground">
            <Link to="/">
              <ArrowLeft className="size-4" />
              Kembali ke beranda
            </Link>
          </Button>

          <div className="card-shadow rounded-4xl bg-card p-8">
            <h1 className="text-3xl font-bold text-foreground">Masuk</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Masuk untuk melihat dashboard pemantauan Anda.
            </p>

            {errorMessage && (
              <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl bg-background px-4 py-6"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <a href="#" className="text-xs font-semibold text-primary hover:underline">
                    Lupa kata sandi?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-2xl bg-background px-4 py-6"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="rounded-full font-semibold"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
