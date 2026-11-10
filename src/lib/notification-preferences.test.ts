import { beforeEach, describe, expect, it } from "vitest";

import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/notification-preferences";

describe("notification preferences", () => {
  beforeEach(() => localStorage.clear());

  it("uses safe defaults and persists changes", () => {
    expect(getNotificationPreferences()).toEqual({ popup: true, sound: true, desktop: false });

    saveNotificationPreferences({ popup: false, sound: false, desktop: true });

    expect(getNotificationPreferences()).toEqual({ popup: false, sound: false, desktop: true });
  });
});
