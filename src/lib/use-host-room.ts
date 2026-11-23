"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { HostSession, RoomSnapshot } from "@/lib/game";
import { useWakeLock } from "@/lib/use-wake-lock";

const KEY = "quizclub-host-session-v1";
export function useHostRoom() {
  const [session, setSession] = useState<HostSession | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [connection, setConnection] = useState<"connecting" | "online" | "offline">("connecting");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const create = useCallback(async () => {
    setConnection("connecting");
    try {
      const result = await api<HostSession>("/api/rooms", { method: "POST" });
      try { localStorage.setItem(KEY, JSON.stringify(result)); } catch { /* Storage is optional. */ }
      setSession(result); setConnection("online");
    } catch (e) { setConnection("offline"); setError(e instanceof Error ? e.message : "Impossible d’ouvrir le salon."); }
  }, []);
  /** Ferme le salon actuel et en ouvre un nouveau, avec un autre code et un autre QR code. */
  const renew = useCallback(async () => {
    if (!session) return false;
    setBusy(true); setConnection("connecting");
    try {
      const result = await api<HostSession>("/api/rooms", { method: "POST", headers: { "x-host-token": session.hostToken }, body: JSON.stringify({ action: "renew" }) });
      try { localStorage.setItem(KEY, JSON.stringify(result)); } catch { /* Storage is optional. */ }
      setRoom(null); setSession(result); setConnection("online"); return true;
    } catch (e) { setConnection("online"); setError(e instanceof Error ? e.message : "Impossible de générer un nouveau code."); return false; }
    finally { setBusy(false); }
  }, [session]);
  useEffect(() => {
    let disposed = false;
    const init = async () => {
      let saved: HostSession | null = null;
      try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { /* Start a fresh room. */ }
      if (saved?.code && saved?.hostToken) {
        try {
          const snapshot = await api<RoomSnapshot>(`/api/rooms?code=${encodeURIComponent(saved.code)}`, { headers: { "x-host-token": saved.hostToken } });
          if (!disposed) { setSession(saved); setRoom(snapshot); setConnection("online"); }
          return;
        } catch { /* Expired rooms are replaced automatically. */ }
      }
      if (!disposed) await create();
    };
    void init();
    return () => { disposed = true; };
  }, [create]);
  useEffect(() => {
    if (!session) return;
    let disposed = false, loading = false;
    const poll = async () => {
      if (loading) return; loading = true;
      try {
        const result = await api<RoomSnapshot>(`/api/rooms?code=${session.code}`, { headers: { "x-host-token": session.hostToken } });
        if (!disposed) { setRoom(result); setConnection("online"); }
      } catch { if (!disposed) setConnection("offline"); }
      finally { loading = false; }
    };
    void poll(); const timer = window.setInterval(poll, 1500);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [session]);
  const command = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    if (!session) { setError("Le salon est encore en préparation. Une petite seconde !"); return false; }
    setBusy(true);
    try {
      const snapshot = await api<RoomSnapshot>(`/api/rooms/${session.code}`, { method: "POST", headers: { "x-host-token": session.hostToken }, body: JSON.stringify({ action, ...data }) });
      setRoom(snapshot); setConnection("online"); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Cette commande n’a pas abouti."); return false; }
    finally { setBusy(false); }
  }, [session]);
  useWakeLock(Boolean(session));
  const clearError = useCallback(() => setError(""), []);
  return { session, room, connection, busy, error, clearError, create, renew, command };
}
