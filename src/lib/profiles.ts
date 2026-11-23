import { ApiError } from "@/lib/api-error";
import type { ClubProfile } from "@/lib/game";

/**
 * Profils des joueurs, enregistrés sur l'appareil de l'hôte : portefeuille de pièces
 * conservé d'une soirée à l'autre et statistiques cumulées.
 * Une fusion redirige l'ancien identifiant vers le profil conservé.
 */
const KEY = "quizclub-profiles-v1";
const ALIAS_KEY = "quizclub-profile-alias-v1";
export const STARTING_COINS = 150;

function load<T>(key: string, fallback: T): T {
  try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v ?? fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Stockage plein : la partie continue. */ }
}
const all = () => load<Record<string, ClubProfile>>(KEY, {});
const aliases = () => load<Record<string, string>>(ALIAS_KEY, {});

export function resolveProfileId(id: string): string {
  const map = aliases(); let current = id;
  for (let i = 0; i < 10 && map[current]; i++) current = map[current];
  return current;
}
export function getProfile(id: string): ClubProfile | undefined { return all()[resolveProfileId(id)]; }
function blank(id: string, name: string, avatar: number): ClubProfile {
  const now = new Date().toISOString();
  return { id, name, avatar, coins: STARTING_COINS, gamesPlayed: 0, wins: 0, totalScore: 0, bestScore: 0, correct: 0, answered: 0, firstSeen: now, lastSeen: now };
}
/** Crée le profil s'il n'existe pas et renvoie ses pièces. */
export function ensureProfile(id: string, name: string, avatar: number): ClubProfile {
  const profiles = all();
  const profile = profiles[id] ?? blank(id, name, avatar);
  profiles[id] = { ...profile, name, avatar, lastSeen: new Date().toISOString() };
  save(KEY, profiles);
  return profiles[id];
}
type LivePlayer = { profileId: string; name: string; avatar: number; coins: number; score: number; correct: number };
/** Recopie le portefeuille des joueurs du salon dans leur profil. */
export function syncWallets(players: LivePlayer[]) {
  const profiles = all(); let changed = false;
  for (const p of players) {
    const current = profiles[p.profileId] ?? blank(p.profileId, p.name, p.avatar);
    if (current.coins !== p.coins || current.name !== p.name || current.avatar !== p.avatar) { profiles[p.profileId] = { ...current, coins: p.coins, name: p.name, avatar: p.avatar }; changed = true; }
  }
  if (changed) save(KEY, profiles);
}
/** Ajoute une partie terminée aux statistiques de chaque joueur. */
export function recordGame(players: LivePlayer[], totalQuestions: number) {
  const profiles = all(); const now = new Date().toISOString();
  const top = Math.max(0, ...players.map(p => p.score));
  for (const p of players) {
    const c = profiles[p.profileId] ?? blank(p.profileId, p.name, p.avatar);
    profiles[p.profileId] = {
      ...c, name: p.name, avatar: p.avatar, coins: p.coins, lastSeen: now,
      gamesPlayed: c.gamesPlayed + 1, wins: c.wins + (top > 0 && p.score === top ? 1 : 0),
      totalScore: c.totalScore + p.score, bestScore: Math.max(c.bestScore, p.score),
      correct: c.correct + p.correct, answered: c.answered + totalQuestions,
    };
  }
  save(KEY, profiles);
}

export function listProfiles(): ClubProfile[] {
  return Object.values(all()).sort((a, b) => b.totalScore - a.totalScore || b.gamesPlayed - a.gamesPlayed);
}
export function profilesAction(body: Record<string, unknown>): ClubProfile[] {
  const profiles = all();
  if (body.action === "merge") {
    const from = String(body.from), into = String(body.into);
    const a = profiles[from], b = profiles[into];
    if (!a || !b || from === into) throw new ApiError("Choisissez deux profils différents.");
    profiles[into] = {
      ...b, coins: a.coins + b.coins, gamesPlayed: a.gamesPlayed + b.gamesPlayed, wins: a.wins + b.wins,
      totalScore: a.totalScore + b.totalScore, bestScore: Math.max(a.bestScore, b.bestScore),
      correct: a.correct + b.correct, answered: a.answered + b.answered,
      firstSeen: a.firstSeen < b.firstSeen ? a.firstSeen : b.firstSeen, lastSeen: a.lastSeen > b.lastSeen ? a.lastSeen : b.lastSeen,
    };
    delete profiles[from];
    const map = aliases(); map[from] = into;
    for (const k of Object.keys(map)) if (map[k] === from) map[k] = into;
    save(ALIAS_KEY, map);
  } else if (body.action === "coins") {
    const p = profiles[String(body.id)]; const amount = body.amount;
    if (!p || typeof amount !== "number" || !Number.isInteger(amount) || Math.abs(amount) > 1_000_000) throw new ApiError("Montant invalide.");
    p.coins = Math.max(0, p.coins + amount);
  } else if (body.action === "delete") {
    delete profiles[String(body.id)];
  } else throw new ApiError("Commande inconnue.");
  save(KEY, profiles);
  return listProfiles();
}

/** Profils et redirections de fusion, pour la sauvegarde complète. */
export function exportProfiles() { return { profiles: Object.values(all()), aliases: aliases() }; }
/** Fusionne des profils importés : en cas de doublon, le plus récemment vu l'emporte. */
export function importProfiles(data: { profiles?: unknown; aliases?: unknown }) {
  const num = (v: unknown, max = 1e9) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0;
  const date = (v: unknown) => typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : new Date().toISOString();
  const profiles = all(); let count = 0;
  for (const raw of Array.isArray(data.profiles) ? data.profiles.slice(0, 500) : []) {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length < 8 || r.id.length > 64 || typeof r.name !== "string" || r.name.trim().length < 2) continue;
    const incoming: ClubProfile = { id: r.id, name: r.name.trim().slice(0, 24), avatar: num(r.avatar, 7), coins: num(r.coins), gamesPlayed: num(r.gamesPlayed), wins: num(r.wins), totalScore: num(r.totalScore), bestScore: num(r.bestScore), correct: num(r.correct), answered: num(r.answered), firstSeen: date(r.firstSeen), lastSeen: date(r.lastSeen) };
    const current = profiles[incoming.id];
    if (!current || Date.parse(incoming.lastSeen) >= Date.parse(current.lastSeen)) { profiles[incoming.id] = incoming; count++; }
  }
  save(KEY, profiles);
  const map = aliases();
  if (data.aliases && typeof data.aliases === "object") for (const [from, to] of Object.entries(data.aliases as Record<string, unknown>).slice(0, 500)) if (typeof to === "string" && from !== to && from.length <= 64 && to.length <= 64) map[from] = to;
  save(ALIAS_KEY, map);
  return count;
}
