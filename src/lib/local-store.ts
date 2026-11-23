import { asset } from "@/lib/base";
import { validateQuestions, type HighScore, type QuizPack } from "@/lib/game";
import { ApiError } from "@/lib/api-error";

const PACKS_KEY = "quizclub-custom-packs-v1";
const SCORES_KEY = "quizclub-club-scores-v1";

type StoredPack = Pick<QuizPack, "id" | "title" | "description" | "questions">;
const decorate = (p: StoredPack): QuizPack => ({ ...p, image: asset("/images/quiz-universe.svg"), color: "#b99aef", icon: "sparkles", custom: true });
function read<T>(key: string): T[] {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
function write(key: string, rows: unknown[]) {
  try { localStorage.setItem(key, JSON.stringify(rows)); }
  catch { throw new ApiError("Le navigateur manque de place pour sauvegarder ce quiz. Essayez avec des médias plus légers."); }
}

export function readCustomPacks(): QuizPack[] { return read<StoredPack>(PACKS_KEY).map(decorate); }
export function saveCustomPack(body: Record<string, unknown>): QuizPack {
  const title = body.title;
  if (typeof title !== "string" || title.trim().length < 3 || title.length > 80) throw new ApiError("Le titre doit contenir entre 3 et 80 caractères.");
  if (!validateQuestions(body.questions)) throw new ApiError("Chaque question doit avoir un énoncé, quatre réponses et une bonne réponse. Vérifiez aussi le format des médias.");
  const pack: StoredPack = {
    id: crypto.randomUUID(), title: title.trim(),
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 200) : "Créé avec amour, joué entre amis.",
    questions: body.questions,
  };
  write(PACKS_KEY, [pack, ...read<StoredPack>(PACKS_KEY)].slice(0, 50));
  return decorate(pack);
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
