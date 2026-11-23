import { resolveCover, validCover } from "@/lib/covers";
import { validateQuestions, type HighScore, type QuizPack } from "@/lib/game";
import { ApiError } from "@/lib/api-error";

const PACKS_KEY = "quizclub-custom-packs-v1";
const SCORES_KEY = "quizclub-club-scores-v1";

type StoredPack = Pick<QuizPack, "id" | "title" | "description" | "questions" | "cover">;
const decorate = (p: StoredPack): QuizPack => ({ ...p, ...resolveCover(p.cover), color: "#b99aef", icon: "sparkles", custom: true });
function read<T>(key: string): T[] {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
function write(key: string, rows: unknown[]) {
  try { localStorage.setItem(key, JSON.stringify(rows)); }
  catch { throw new ApiError("Le navigateur manque de place pour sauvegarder ce quiz. Essayez avec des médias plus légers."); }
}

export function readCustomPacks(): QuizPack[] { return read<StoredPack>(PACKS_KEY).map(decorate); }
function cleanPack(body: Record<string, unknown>, keepId?: string): StoredPack {
  const title = body.title;
  if (typeof title !== "string" || title.trim().length < 3 || title.length > 80) throw new ApiError("Le titre doit contenir entre 3 et 80 caractères.");
  if (!validateQuestions(body.questions)) throw new ApiError("Chaque question doit avoir un énoncé, quatre réponses et une bonne réponse. Vérifiez aussi les liens des médias (YouTube, début et fin).");
  return {
    id: keepId ?? crypto.randomUUID(), title: title.trim(),
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 200) : "Créé avec amour, joué entre amis.",
    questions: body.questions,
    ...(body.cover !== undefined && body.cover !== null && body.cover !== "" ? (validCover(body.cover) ? { cover: body.cover } : (() => { throw new ApiError("L’affiche du quiz n’est pas valide."); })()) : {}),
  };
}
/** Crée un quiz, ou le met à jour sur place si `id` correspond à l'un de vos quiz. */
export function saveCustomPack(body: Record<string, unknown>): QuizPack {
  const rows = read<StoredPack>(PACKS_KEY);
  const existing = typeof body.id === "string" ? rows.find(p => p.id === body.id) : undefined;
  const pack = cleanPack(body, existing?.id);
  write(PACKS_KEY, existing ? rows.map(p => p.id === pack.id ? pack : p) : [pack, ...rows].slice(0, 100));
  return decorate(pack);
}
export function deleteCustomPack(id: unknown) {
  write(PACKS_KEY, read<StoredPack>(PACKS_KEY).filter(p => p.id !== id));
  return { ok: true };
}
export const BACKUP_FORMAT = "random-quizz-backup";
export function exportBackup() {
  return { app: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), packs: read<StoredPack>(PACKS_KEY).map(({ id, title, description, questions, cover }) => ({ id, title, description, questions, cover })) };
}
/** Fusionne une sauvegarde : un quiz de même identifiant est remplacé, les autres sont ajoutés. */
export function importBackup(body: Record<string, unknown>): QuizPack[] {
  const incoming = Array.isArray(body.packs) ? body.packs : null;
  if (!incoming || body.app !== BACKUP_FORMAT) throw new ApiError("Ce fichier n’est pas une sauvegarde Random Quizz.");
  const rows = read<StoredPack>(PACKS_KEY);
  for (const raw of incoming.slice(0, 100)) {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const id = typeof item.id === "string" && /^[0-9a-f-]{36}$/i.test(item.id) ? item.id : undefined;
    const pack = cleanPack(item, id);
    const at = rows.findIndex(p => p.id === pack.id);
    if (at >= 0) rows[at] = pack; else rows.unshift(pack);
  }
  write(PACKS_KEY, rows.slice(0, 100));
  return readCustomPacks();
}

export function readClubScores(): HighScore[] {
  return read<HighScore>(SCORES_KEY).sort((a, b) => b.score - a.score).slice(0, 30);
}
export function saveClubScore(body: Record<string, unknown>) {
  const { name, score, correct, total, packName } = body;
  const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
  if (typeof name !== "string" || name.trim().length < 2 || name.length > 24 || !isInt(score) || score < 0 || score > 120000 || !isInt(total) || total < 1 || total > 30 || !isInt(correct) || correct < 0 || correct > total || typeof packName !== "string") throw new ApiError("Ce score n’est pas valide.");
  const row: HighScore = { id: crypto.randomUUID(), name: name.trim(), score, correct, total, packName: packName.slice(0, 80), date: new Date().toISOString() };
  write(SCORES_KEY, [row, ...read<HighScore>(SCORES_KEY)].sort((a, b) => b.score - a.score).slice(0, 100));
  return { id: row.id };
}
