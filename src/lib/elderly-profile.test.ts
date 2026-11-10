import { beforeEach, describe, expect, it, vi } from "vitest";

import { getElderlyName, saveElderlyName } from "@/lib/elderly-profile";
import { authApi, setUser } from "@/lib/api";

describe("elderly profile", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores a trimmed elderly name through the backend", async () => {
    setUser({
      id: "1",
      name: "Budi",
      email: "budi@example.com",
      role: "Pendamping",
      avatar_initials: "B",
    });
    vi.spyOn(authApi, "updateProfile").mockImplementation(async ({ elderly_name }) => {
      const user = {
        id: "1",
        name: "Budi",
        email: "budi@example.com",
        role: "Pendamping",
        avatar_initials: "B",
        elderly_name: elderly_name ?? null,
      };
      setUser(user);
      return user;
    });
    await saveElderlyName("  Ibu Siti  ");
    expect(getElderlyName()).toBe("Ibu Siti");
    expect(authApi.updateProfile).toHaveBeenCalledWith({ elderly_name: "Ibu Siti" });
  });

  it("rejects an empty name", async () => {
    await expect(saveElderlyName("   ")).rejects.toThrow("Nama lansia harus diisi.");
  });
});
