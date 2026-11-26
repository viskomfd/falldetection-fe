import { useEffect, useState } from "react";

import {
  isIosDevice,
  isStandalonePwa,
  type BeforeInstallPromptEvent,
} from "@/lib/push-notifications";

export type PwaInstallOutcome = "accepted" | "dismissed" | "ios-guide" | "manual-hint";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedState = false;
let listenersAttached = false;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  for (const listener of subscribers) {
    listener();
  }
}

export function ensurePwaInstallListeners(): void {
  if (typeof window === "undefined" || listenersAttached) return;
  listenersAttached = true;
  installedState = isStandalonePwa();

  window.addEventListener("beforeinstallprompt", (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener("appinstalled", () => {
    installedState = true;
    deferredPrompt = null;
    notifySubscribers();
  });
}

export function usePwaInstall() {
  const [, setTick] = useState(0);

  useEffect(() => {
    ensurePwaInstallListeners();
    installedState = isStandalonePwa();
    const forceUpdate = () => setTick((t) => t + 1);
    subscribers.add(forceUpdate);
    forceUpdate();
    return () => {
      subscribers.delete(forceUpdate);
    };
  }, []);

  async function triggerInstall(): Promise<PwaInstallOutcome> {
    if (deferredPrompt) {
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      notifySubscribers();
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          installedState = true;
          notifySubscribers();
          return "accepted";
        }
        return "dismissed";
      } catch {
        return "manual-hint";
      }
    }

    if (isIosDevice()) {
      return "ios-guide";
    }

    return "manual-hint";
  }

  return {
    isInstalled: installedState,
    canNativePrompt: deferredPrompt !== null,
    isIos: isIosDevice(),
    triggerInstall,
  };
}
