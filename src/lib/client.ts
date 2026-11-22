import type { HighScore } from "@/lib/game";
import { HIGH_SCORE_KEY } from "@/lib/game";

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Une petite interruption… Réessayez !");
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
