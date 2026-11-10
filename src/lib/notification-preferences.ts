export interface NotificationPreferences {
  popup: boolean;
  sound: boolean;
  desktop: boolean;
}

const STORAGE_KEY = "rumi_notification_preferences";
const DEFAULT_PREFERENCES: NotificationPreferences = {
  popup: true,
  sound: true,
  desktop: false,
};

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const stored = {
      ...DEFAULT_PREFERENCES,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"),
    };
    const desktopAllowed = "Notification" in window && window.Notification.permission === "granted";
    return { ...stored, desktop: stored.desktop && desktopAllowed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }
}
