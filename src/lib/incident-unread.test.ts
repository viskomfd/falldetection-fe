import { beforeEach, describe, expect, it } from "vitest";

import type { Incident } from "@/lib/api";
import { hasUnreadIncidents, markIncidentsRead, markIncidentUnread } from "@/lib/incident-unread";

const INCIDENT: Incident = {
  id: "incident-1",
  camera_name: "Cam 01",
  location: "Ruang Tamu",
  person_name: "Ibu Siti",
  detected_at: "2026-01-01T00:00:00.000Z",
  confidence: 0.9,
  clip_duration: "8 dtk",
  response_time_seconds: 2,
  status: "detected",
};

describe("incident unread state", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows existing incidents until history is opened", () => {
    expect(hasUnreadIncidents([INCIDENT])).toBe(true);
    markIncidentsRead();
    expect(hasUnreadIncidents([INCIDENT])).toBe(false);
  });

  it("shows and clears a real-time incident", () => {
    markIncidentUnread();
    expect(hasUnreadIncidents()).toBe(true);
    markIncidentsRead();
    expect(hasUnreadIncidents()).toBe(false);
  });
});
