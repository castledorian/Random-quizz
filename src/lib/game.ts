import { asset } from "@/lib/base";
import { foodQuestions, mixQuestions, popQuestions, worldQuestions } from "@/lib/builtin-questions";

export type Question = {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  category: string;
  /** Ancien format (fichier importé) : conservé pour les quiz déjà créés. */
  mediaUrl?: string;
  mediaType?: "image" | "audio";
  /** Média par lien : photo/GIF, vidéo ou musique YouTube (avec début et fin). */
  media?: QuestionMedia;
  /** Chrono en secondes : 0 = sans limite de temps, absent = 20 s. */
  time?: number;
  /** Type de question (absent = choix multiple). */
  type?: QType;
  /** Plusieurs réponses : indices des bonnes réponses. */
  corrects?: number[];
  /** Réponse courte : réponses acceptées. */
  answers?: string[];
  /** Trouver un nombre : valeur attendue et marge acceptée. */
  target?: number;
  tolerance?: number;
};

export type QType = "choice" | "multi" | "truefalse" | "short" | "order" | "number" | "poll" | "scale" | "open";
export type Answer = number | number[] | string;
export const QTYPES: { id: QType; label: string; hint: string; scored: boolean }[] = [
  { id: "choice", label: "Choix multiple", hint: "Une seule bonne réponse", scored: true },
  { id: "multi", label: "Plusieurs réponses", hint: "Cocher toutes les bonnes", scored: true },
  { id: "truefalse", label: "Vrai ou faux", hint: "Deux propositions", scored: true },
  { id: "short", label: "Réponse courte", hint: "Le joueur tape sa réponse", scored: true },
  { id: "order", label: "Remettre dans l’ordre", hint: "Classer des étapes, des dates", scored: true },
  { id: "number", label: "Trouver un nombre", hint: "Avec une marge acceptée", scored: true },
  { id: "poll", label: "Sondage", hint: "Tout le monde vote, sans points", scored: false },
  { id: "scale", label: "Échelle", hint: "Une note de 1 à 5, sans points", scored: false },
  { id: "open", label: "Question ouverte", hint: "Réponses libres au tableau, sans points", scored: false },
];
export const SCALE_MAX = 5;
export const qtype = (q: { type?: QType }): QType => q.type ?? "choice";
export const isScored = (q: { type?: QType }) => QTYPES.find(t => t.id === qtype(q))?.scored ?? true;
/** Types dont les propositions s’affichent sous forme de grille. */
export const hasGrid = (q: { type?: QType }) => ["choice", "multi", "truefalse", "poll", "order"].includes(qtype(q));
/** Types où le joueur touche une seule proposition. */
export const isSinglePick = (q: { type?: QType }) => ["choice", "truefalse", "poll"].includes(qtype(q));
export function blankOptions(type: QType): string[] {
  if (type === "truefalse") return ["Vrai", "Faux"];
  if (type === "poll") return ["", ""];
  if (type === "choice" || type === "multi" || type === "order") return ["", "", "", ""];
  return [];
}
/** Ordre d’affichage mélangé (stable pour une même question). perm[affiché] = indice d’origine. */
export function orderPerm(q: { id: string; options: string[] }): number[] {
  const n = q.options.length, perm = Array.from({ length: n }, (_, i) => i);
  let h = 2166136261;
  for (const c of q.id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h = (h + 0x6d2b79f5) >>> 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  if (n > 1 && perm.every((v, i) => v === i)) perm.push(perm.shift()!);
  return perm;
}
/** Propositions telles que le joueur les voit (mélangées pour « remettre dans l’ordre »). */
export const displayOptions = (q: { id: string; type?: QType; options: string[] }) => qtype(q) === "order" ? orderPerm(q).map(i => q.options[i]) : q.options;
/** Pour « remettre dans l’ordre » : indices affichés, dans le bon ordre. */
export function orderSolution(q: { id: string; options: string[] }): number[] { const p = orderPerm(q); return p.map((_, k) => p.indexOf(k)); }
export const normalizeText = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!t || !/^-?\d*\.?\d+$/.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}
/** Vérifie la forme d’une réponse reçue et la normalise ; null si invalide. */
export function sanitizeAnswer(q: Question, raw: unknown): Answer | null {
  const int = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
  const inRange = (v: unknown): v is number => int(v) && v >= 0 && v < q.options.length;
  switch (qtype(q)) {
    case "choice": case "truefalse": case "poll": return inRange(raw) ? raw : null;
    case "scale": return int(raw) && raw >= 1 && raw <= SCALE_MAX ? raw : null;
    case "multi": { if (!Array.isArray(raw) || !raw.length || !raw.every(inRange)) return null; return [...new Set(raw as number[])].sort((a, b) => a - b); }
    case "order": { if (!Array.isArray(raw) || raw.length !== q.options.length || !raw.every(inRange) || new Set(raw).size !== raw.length) return null; return raw as number[]; }
    case "number": return typeof raw === "number" && Number.isFinite(raw) && Math.abs(raw) < 1e12 ? raw : null;
    case "short": case "open": { if (typeof raw !== "string") return null; const t = raw.trim().slice(0, 120); return t || null; }
  }
}
/** true = juste, false = faux, null = question sans bonne réponse. */
export function gradeAnswer(q: Question, a: Answer): boolean | null {
  switch (qtype(q)) {
    case "choice": case "truefalse": return a === q.correct;
    case "multi": { const c = [...(q.corrects ?? [])].sort((x, y) => x - y), m = a as number[]; return c.length === m.length && c.every((v, i) => v === m[i]); }
    case "order": { const p = orderPerm(q); return (a as number[]).every((d, i) => p[d] === i); }
    case "short": { const n = normalizeText(a as string); return (q.answers ?? []).some(x => normalizeText(x) === n); }
    case "number": return Math.abs((a as number) - (q.target ?? 0)) <= (q.tolerance ?? 0) + 1e-9;
    default: return null;
  }
}
export type SnapshotQuestion = Omit<Question, "correct" | "explanation" | "corrects" | "answers" | "target" | "tolerance"> & Partial<Pick<Question, "correct" | "explanation" | "corrects" | "answers" | "target" | "tolerance">> & { solution?: number[] };
/** Phrase qui annonce la solution (hôte, joueur, solo). */
export function solutionText(q: SnapshotQuestion): string {
  const opt = (i: number) => q.options[i] ?? "";
  switch (qtype(q)) {
    case "choice": case "truefalse": return `C’était bien ${opt(q.correct ?? 0)} !`;
    case "multi": return `Les bonnes réponses : ${(q.corrects ?? []).map(opt).join(", ")}.`;
    case "order": return `Le bon ordre : ${(q.solution ?? []).map(opt).join(" → ")}.`;
    case "short": return `Réponse attendue : ${(q.answers ?? [])[0] ?? ""}${(q.answers?.length ?? 0) > 1 ? ` (ou ${q.answers!.slice(1).join(", ")})` : ""}.`;
    case "number": return `La réponse : ${new Intl.NumberFormat("fr-FR").format(q.target ?? 0)}${q.tolerance ? ` (à ± ${new Intl.NumberFormat("fr-FR").format(q.tolerance)} près)` : ""}.`;
    default: return "Merci pour vos réponses !";
  }
}
export type QuestionStats = { total: number; right?: number; counts?: number[]; texts?: { name: string; avatar: number; text: string; ok: boolean | null }[]; avg?: number };

export type QuestionMedia = { kind: "photo" | "video" | "music"; url: string; start?: number; end?: number; /** Fondu sonore au début et à la fin (activé par défaut). */ fade?: boolean };
export type ClipSource = { type: "youtube"; id: string } | { type: "file"; url: string };
export const MAX_PLAYERS = 24;

export type QuizPack = {
  id: string;
  title: string;
  description: string;
  image: string;
  color: string;
  icon: string;
  questions: Question[];
  custom?: boolean;
  /** Affiche choisie : « cover:<id> », image importée (data-URL) ou lien. */
  cover?: string;
  coverId?: string;
};

export const PACKS: QuizPack[] = [
  { id: "pop", title: "Pop culture", description: "Pour les pros de la référence.", image: asset("/images/covers/pop-culture.webp"), color: "#9b75ed", icon: "gamepad", questions: popQuestions },
  { id: "world", title: "Tour du monde", description: "Le voyage, sans le décalage.", image: asset("/images/covers/world.webp"), color: "#5dcab2", icon: "globe", questions: worldQuestions },
  { id: "food", title: "À table !", description: "À déguster sans modération.", image: asset("/images/covers/food.webp"), color: "#f4a66d", icon: "food", questions: foodQuestions },
];
export const MIX_PACK: QuizPack = {
  id: "mix", title: "Le grand mélange", description: "Un peu de tout, beaucoup de fun.", image: asset("/images/hero.webp"), color: "#c6f36b", icon: "sparkles",
  questions: mixQuestions,
};
export const ALL_PACKS = [MIX_PACK, ...PACKS];
export const AVATARS = ["👾", "🦊", "🐸", "🦄", "🐼", "🦁", "🐙", "🐱"];
export const AVATAR_COLORS = ["#b395eb", "#eeab79", "#b8d981", "#d59cc5", "#b4c5dc", "#e8cc78", "#a3b5e7", "#9bd4c2"];
export const QUESTION_TIME = 20;
export const HIGH_SCORE_KEY = "quizclub-highscores-v1";

export type HighScore = { id: string; name: string; score: number; correct: number; total: number; packName: string; date: string };
export type RoomPlayer = { id: string; name: string; avatar: number; score: number; coins: number; vote: string | null; hasAnswered: boolean; doubleNext: boolean; shield: boolean; hint: boolean };
export type RoomStatus = "lobby" | "playing" | "paused" | "revealed" | "finished";
export type RoomSnapshot = {
  code: string; status: RoomStatus; packId: string; packTitle: string; questionIndex: number; totalQuestions: number;
  question: SnapshotQuestion | null;
  /** Résultats agrégés, une fois la question révélée. */
  stats?: QuestionStats;
  /** Votre réponse et vos points, une fois la question révélée. */
  mine?: { right: boolean | null; points: number; answer: Answer };
  startedAt: string | null; remainingSeconds: number; players: RoomPlayer[]; answerCount: number;
  shopEnabled: boolean; votingEnabled: boolean; eliminated: number[];
  /** Vrai si le maître du jeu a retiré ce joueur du salon. */
  kicked?: boolean;
  /** Vidéos et musiques lisibles sur le téléphone des joueurs (réglage de l’hôte). */
  phoneMedia?: boolean;
  /** Thèmes d’origine proposables au vote (ceux que l’hôte n’a pas retirés). */
  votePacks?: string[];
  /** Durée de la question en secondes (0 = sans limite). */
  timeLimit: number;
  /** Média de la question suivante, réservé à l’hôte : permet de le précharger. */
  upcomingMedia?: QuestionMedia | null;
};
export type ClubProfile = { id: string; name: string; avatar: number; coins: number; gamesPlayed: number; wins: number; totalScore: number; bestScore: number; correct: number; answered: number; firstSeen: string; lastSeen: string };
export type HostSession = { code: string; hostToken: string };
export type PlayerSession = { code: string; playerToken: string; playerId: string; profileId: string; name: string; avatar: number };

export const SHOP_ITEMS = [
  { id: "double", name: "Double mise", description: "Doublez les points de votre prochaine bonne réponse.", price: 100, icon: "zap", color: "#c6f36b", label: "×2" },
  { id: "hint", name: "Le 50 / 50", description: "Deux mauvaises réponses disparaissent. À vous de jouer.", price: 75, icon: "wand", color: "#b99aef", label: "½" },
  { id: "shield", name: "Filet de sécurité", description: "Une erreur ? Vous gagnez tout de même 150 points.", price: 150, icon: "shield", color: "#78cabb", label: "♡" },
] as const;

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else id = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
/** Reconnaît un lien YouTube ou un lien direct vers un fichier vidéo/audio. */
export function clipSource(url: string): ClipSource | null {
  const id = youtubeId(url);
  if (id) return { type: "youtube", id };
  try {
    const u = new URL(url.trim());
    if (/^https?:$/.test(u.protocol) && /\.(mp4|webm|mov|m4v|ogv|mp3|m4a|aac|ogg|oga|wav|flac|opus)$/i.test(u.pathname)) return { type: "file", url: u.href };
  } catch { /* Lien invalide. */ }
  return null;
}
/** « 1:23 », « 83 », « 1h2m3s » → secondes. Renvoie null si vide ou invalide. */
export function parseTime(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})$/);
  if (parts) return Number(parts[1] || 0) * 3600 + Number(parts[2]) * 60 + Number(parts[3]);
  const hms = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) return Number(hms[1] || 0) * 3600 + Number(hms[2] || 0) * 60 + Number(hms[3] || 0);
  return null;
}
export function formatTime(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "";
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
export function validMedia(m: unknown): m is QuestionMedia {
  if (!m || typeof m !== "object") return false;
  const { kind, url, start, end, fade } = m as Record<string, unknown>;
  if (fade !== undefined && typeof fade !== "boolean") return false;
  if (kind !== "photo" && kind !== "video" && kind !== "music") return false;
  if (typeof url !== "string" || url.length > 1000 || !/^https?:\/\//i.test(url.trim())) return false;
  if (kind !== "photo") {
    if (!clipSource(url)) return false;
    const ok = (v: unknown) => v === undefined || (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 86400);
    if (!ok(start) || !ok(end)) return false;
    if (typeof start === "number" && typeof end === "number" && end <= start) return false;
  }
  return true;
}

function validShape(q: Record<string, unknown>): boolean {
  const type = (q.type ?? "choice") as QType;
  if (!QTYPES.some(t => t.id === type)) return false;
  const options = q.options as unknown;
  if (!Array.isArray(options) || !options.every(o => typeof o === "string" && o.trim().length > 0 && o.length <= 180)) return false;
  const int = (v: unknown, max: number) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
  switch (type) {
    case "choice": return options.length === 4 && int(q.correct, 3);
    case "truefalse": return options.length === 2 && int(q.correct, 1);
    case "multi": return options.length === 4 && Array.isArray(q.corrects) && q.corrects.length >= 1 && q.corrects.every(v => int(v, 3)) && new Set(q.corrects).size === q.corrects.length;
    case "order": return options.length === 4;
    case "poll": return options.length >= 2 && options.length <= 6;
    case "short": return options.length === 0 && Array.isArray(q.answers) && q.answers.length >= 1 && q.answers.length <= 8 && q.answers.every(a => typeof a === "string" && a.trim().length > 0 && a.length <= 120);
    case "number": return options.length === 0 && typeof q.target === "number" && Number.isFinite(q.target) && Math.abs(q.target) < 1e12 && (q.tolerance === undefined || (typeof q.tolerance === "number" && Number.isFinite(q.tolerance) && q.tolerance >= 0 && q.tolerance < 1e12));
    default: return options.length === 0;
  }
}
export function validateQuestions(value: unknown): value is Question[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 30 && value.every(q =>
    q && typeof q.id === "string" && typeof q.prompt === "string" && q.prompt.trim().length > 2 && q.prompt.length <= 500 &&
    validShape(q) && typeof q.explanation === "string" && typeof q.category === "string" &&
    (q.media === undefined || validMedia(q.media)) &&
    (q.time === undefined || (Number.isInteger(q.time) && q.time >= 0 && q.time <= 600)) &&
    (!q.mediaUrl || (typeof q.mediaUrl === "string" && q.mediaUrl.length <= 4000000 && /^data:(image\/(png|jpeg|webp|gif)|audio\/(mpeg|mp3|wav|ogg|x-wav));base64,/.test(q.mediaUrl)))
  );
}
export const questionTime = (q?: Pick<Question, "time">) => q?.time === undefined ? QUESTION_TIME : q.time;
export function formatScore(score: number) { return new Intl.NumberFormat("fr-FR").format(score); }
