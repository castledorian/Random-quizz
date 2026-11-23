"use client";

import { useEffect } from "react";

/** Garde l'écran allumé tant que `active` est vrai (une mise en veille coupe la partie). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null; let stopped = false;
    const request = async () => {
      if (stopped || lock || document.visibilityState !== "visible") return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (stopped) { void sentinel.release().catch(() => {}); return; }
        lock = sentinel; sentinel.addEventListener("release", () => { if (lock === sentinel) lock = null; });
      } catch { /* Refusé (économie d'énergie) : la partie continue normalement. */ }
    };
    void request();
    const onVisible = () => { void request(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; document.removeEventListener("visibilitychange", onVisible); void lock?.release().catch(() => {}); lock = null; };
  }, [active]);
}
