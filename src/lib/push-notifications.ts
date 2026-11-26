import { pushApi } from "@/lib/api";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export async function subscribeToWebPush(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Web Push hanya tersedia di browser.");
  }
  if (!window.isSecureContext) {
    throw new Error(
      "Notifikasi push memerlukan HTTPS. Buka aplikasi melalui HTTPS atau localhost.",
    );
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Browser ini belum mendukung Web Push Notification.");
  }
  if (!("Notification" in window)) {
    throw new Error("Browser ini belum mendukung Notification API.");
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    throw new Error("Izin notifikasi browser ditolak. Aktifkan melalui pengaturan browser.");
  }

  await navigator.serviceWorker.register("/notification-sw.js");
  const registration = await navigator.serviceWorker.ready;

  const { public_key, enabled } = await pushApi.getVapidPublicKey();
  if (!enabled || !public_key) {
    throw new Error("Web Push belum aktif di server backend.");
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(public_key),
    });
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.["p256dh"];
  const auth = json.keys?.["auth"];

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Data subscription push dari browser tidak lengkap.");
  }

  await pushApi.subscribe({
    endpoint,
    keys: { p256dh, auth },
    user_agent: navigator.userAgent,
  });
}

export async function unsubscribeFromWebPush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/notification-sw.js");
    const activeRegistration = registration ?? (await navigator.serviceWorker.getRegistration());
    if (!activeRegistration?.pushManager) return;

    const subscription = await activeRegistration.pushManager.getSubscription();
    if (!subscription) return;

    try {
      await pushApi.unsubscribe(subscription.endpoint);
    } catch {
      // Best-effort cleanup on backend before local unsubscribe
    }
    await subscription.unsubscribe();
  } catch {
    // Best-effort unsubscribe
  }
}
