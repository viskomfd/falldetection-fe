import { useEffect, useState } from "react";

import { getUser, type Incident } from "@/lib/api";

const INCIDENT_UNREAD_EVENT = "rumi:incident-unread-changed";

function getStorageKey(): string {
  const user = getUser();
  return user?.id ? `rumi-incidents-read-at_${user.id}` : "rumi-incidents-read-at_guest";
}

function emitChange(): void {
  window.dispatchEvent(new Event(INCIDENT_UNREAD_EVENT));
}

export function markIncidentsRead(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(), new Date().toISOString());
  window.localStorage.removeItem(`${getStorageKey()}_unread`);
  emitChange();
}

export function markIncidentUnread(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${getStorageKey()}_unread`, "true");
  emitChange();
}

export function hasUnreadIncidents(incidents: Incident[] = []): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(`${getStorageKey()}_unread`) === "true") return true;

  const readAt = window.localStorage.getItem(getStorageKey());
  if (!readAt) return incidents.length > 0;
  const readTime = new Date(readAt).getTime();
  return incidents.some((incident) => new Date(incident.detected_at).getTime() > readTime);
}

export function useUnreadIncidents(): boolean {
  const [unread, setUnread] = useState(() => hasUnreadIncidents());

  useEffect(() => {
    const sync = () => setUnread(hasUnreadIncidents());
    window.addEventListener(INCIDENT_UNREAD_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(INCIDENT_UNREAD_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return unread;
}
