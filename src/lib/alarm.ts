// Web Audio API sound synthesizer & notification for Fall Alert

export function playFallAlarm(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    function beep(freq: number, start: number, duration: number): void {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    }

    // Play urgent multi-tone alert: High (880Hz) - Higher (1174Hz) - High (880Hz)
    beep(880, 0, 0.22);
    beep(1174, 0.26, 0.22);
    beep(880, 0.52, 0.32);
  } catch (err) {
    console.warn("Could not play alarm sound:", err);
  }
}

export function showDesktopNotification(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
    } catch {
      // ignore
    }
  } else if (Notification.permission === "default") {
    void Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      }
    });
  }
}

