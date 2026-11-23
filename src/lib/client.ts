import type { HighScore } from "@/lib/game";
import { HIGH_SCORE_KEY } from "@/lib/game";
import { deleteCustomPack, hideBuiltIn, importBackup, readClubScores, readCustomPacks, restoreBuiltIns, saveClubScore, saveCustomPack } from "@/lib/local-store";
import { roomsApi } from "@/lib/p2p";
import { listProfiles, profilesAction } from "@/lib/profiles";
import { ApiError } from "@/lib/api-error";

/**
 * Les « routes » /api/* s'exécutent désormais dans le navigateur :
 * quiz et scores en stockage local, salons en direct entre appareils (WebRTC).
 */
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || "GET").toUpperCase() === "POST" ? "POST" : "GET";
  const headers: Record<string, string> = {};
  new Headers(options?.headers).forEach((value, key) => { headers[key.toLowerCase()] = value; });
  const body = typeof options?.body === "string" ? options.body : undefined;
  let status = 200; let data: unknown;
  try {
    if (url.startsWith("/api/rooms")) {
      ({ status, data } = await roomsApi(method, url, headers, body));
    } else if (url.startsWith("/api/quizzes")) {
      if (method === "POST") {
        const payload = JSON.parse(body || "{}");
        data = payload.action === "delete" ? deleteCustomPack(payload.id) : payload.action === "import" ? importBackup(payload) : payload.action === "hide" ? hideBuiltIn(payload.id) : payload.action === "restore" ? restoreBuiltIns() : saveCustomPack(payload);
        status = payload.action ? 200 : 201;
      } else data = readCustomPacks();
    } else if (url.startsWith("/api/profiles")) {
      data = method === "POST" ? profilesAction(JSON.parse(body || "{}")) : listProfiles();
    } else if (url.startsWith("/api/scores")) {
      data = method === "POST" ? saveClubScore(JSON.parse(body || "{}")) : readClubScores();
      if (method === "POST") status = 201;
    } else throw new ApiError("Cette page n’existe pas.", 404);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof SyntaxError) throw new Error("La requête n’est pas valide.");
    throw new Error("Une petite interruption… Réessayez !");
  }
  if (status >= 400) throw new Error((data as { error?: string })?.error || "Une petite interruption… Réessayez !");
  return data as T;
}
export function readHighScores(): HighScore[] {
  try { return JSON.parse(localStorage.getItem(HIGH_SCORE_KEY) || "[]"); } catch { return []; }
}
export function saveHighScore(score: HighScore) {
  const rows = [...readHighScores(), score].sort((a, b) => b.score - a.score).slice(0, 20);
  try { localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(rows)); } catch { /* Private browsing can disable storage. */ }
  return rows;
}
let context: AudioContext | null = null;
export function playSound(kind: "correct" | "wrong" | "click" | "finish" | "buy") {
  try {
    context ??= new window.AudioContext();
    if (context.state === "suspended") void context.resume();
    const notes = kind === "correct" ? [523, 659, 784] : kind === "finish" ? [523, 659, 784, 1047] : kind === "buy" ? [784, 1047] : kind === "wrong" ? [180, 120] : [440];
    notes.forEach((frequency, i) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = kind === "wrong" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      const time = context!.currentTime + i * 0.075;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.075, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
      oscillator.connect(gain); gain.connect(context!.destination);
      oscillator.start(time); oscillator.stop(time + 0.24);
    });
  } catch { /* Audio is optional on unsupported or muted browsers. */ }
}
