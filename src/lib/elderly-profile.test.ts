import { beforeEach, describe, expect, it } from "vitest";

import { getElderlyName, saveElderlyName } from "@/lib/elderly-profile";

describe("elderly profile", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores a trimmed elderly name", () => {
    saveElderlyName("  Ibu Siti  ");
    expect(getElderlyName()).toBe("Ibu Siti");
  });

  it("rejects an empty name", () => {
    expect(() => saveElderlyName("   ")).toThrow("Nama lansia harus diisi.");
  });
});
