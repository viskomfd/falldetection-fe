import { useEffect, useState } from "react";

import { authApi, getUser } from "@/lib/api";

const ELDERLY_CHANGED_EVENT = "rumi:elderly-changed";

export function getElderlyName(): string {
  return getUser()?.elderly_name?.trim() ?? "";
}

export async function saveElderlyName(name: string): Promise<string> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Nama lansia harus diisi.");
  const user = await authApi.updateProfile({ elderly_name: normalizedName });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ELDERLY_CHANGED_EVENT));
  return user.elderly_name ?? normalizedName;
}

export function useElderlyName(): string {
  const [name, setName] = useState(() => getElderlyName());

  useEffect(() => {
    const sync = () => setName(getElderlyName());
    window.addEventListener(ELDERLY_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ELDERLY_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return name;
}
