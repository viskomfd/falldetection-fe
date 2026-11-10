import { useEffect, useState } from "react";

import { getUser } from "@/lib/api";

const ELDERLY_CHANGED_EVENT = "rumi:elderly-changed";

function getStorageKey(): string {
  const user = getUser();
  return user?.id ? `rumi-elderly-name_${user.id}` : "rumi-elderly-name_guest";
}

export function getElderlyName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(getStorageKey())?.trim() ?? "";
}

export function saveElderlyName(name: string): void {
  if (typeof window === "undefined") return;
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Nama lansia harus diisi.");
  window.localStorage.setItem(getStorageKey(), normalizedName);
  window.dispatchEvent(new Event(ELDERLY_CHANGED_EVENT));
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
