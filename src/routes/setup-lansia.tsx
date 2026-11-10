import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HeartHandshake } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getToken } from "@/lib/api";
import { getElderlyName, saveElderlyName } from "@/lib/elderly-profile";

export const Route = createFileRoute("/setup-lansia")({
  head: () => ({ meta: [{ title: "Profil Lansia | Rumi" }] }),
  component: SetupLansiaPage,
});

function SetupLansiaPage() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => getElderlyName());
  const [error, setError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    setAuthChecked(true);
  }, [navigate]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      saveElderlyName(name);
      void navigate({ to: "/dashboard" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nama lansia gagal disimpan.");
    }
  }

  if (!authChecked) return null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLogo imageClassName="size-12" textClassName="text-2xl text-primary" />
        </div>
        <section className="card-shadow rounded-4xl bg-card p-8">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HeartHandshake className="size-6" />
          </span>
          <h1 className="mt-5 text-3xl font-bold text-foreground">Siapa yang akan dipantau?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nama ini akan digunakan pada dashboard dan notifikasi deteksi jatuh.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="elderly-name">Nama Lansia</Label>
              <Input
                id="elderly-name"
                autoFocus
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Ibu Siti"
                className="rounded-2xl bg-background px-4 py-6"
              />
            </div>
            {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="rounded-full font-semibold">
              Simpan dan Mulai
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
