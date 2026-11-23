import { asset } from "@/lib/base";

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
};

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

const popQuestions: Question[] = [
  { id: "pop-1", prompt: "Comment s’appelle le frère de Mario ?", options: ["Wario", "Luigi", "Yoshi", "Toad"], correct: 1, explanation: "C’est Luigi, le célèbre plombier à la casquette verte. Le joueur 2 mérite aussi son moment de gloire !", category: "Pop culture" },
  { id: "pop-2", prompt: "Sur quelle plateforme peut-on regarder Stranger Things ?", options: ["Disney+", "Prime Video", "Netflix", "Apple TV+"], correct: 2, explanation: "Bienvenue à Hawkins ! Stranger Things est une série originale Netflix, lancée en 2016.", category: "Pop culture" },
  { id: "pop-3", prompt: "« Vers l’infini et au-delà ! » Qui a dit ça ?", options: ["Superman", "Buzz l’Éclair", "Wall-E", "Dark Vador"], correct: 1, explanation: "C’est la réplique culte de Buzz l’Éclair dans Toy Story. Ce n’est pas voler, c’est tomber avec panache !", category: "Pop culture" },
  { id: "pop-4", prompt: "De quel type est le Pokémon Pikachu ?", options: ["Feu", "Plante", "Normal", "Électrik"], correct: 3, explanation: "Pikachu est de type Électrik. Ses petites joues rouges emmagasinent de l’électricité.", category: "Pop culture" },
  { id: "pop-5", prompt: "Dans quel pays Spotify a-t-il été créé ?", options: ["États-Unis", "Suède", "Royaume-Uni", "Danemark"], correct: 1, explanation: "Spotify est né à Stockholm, en Suède, en 2006. Comme quoi, il n’y a pas que les meubles en kit !", category: "Pop culture" },
  { id: "pop-6", prompt: "Quel réalisateur a signé les premiers épisodes de Mercredi ?", options: ["Steven Spielberg", "Wes Anderson", "Tim Burton", "Christopher Nolan"], correct: 2, explanation: "L’univers gothique et décalé de Mercredi porte bien la signature de Tim Burton.", category: "Pop culture" },
];
const worldQuestions: Question[] = [
  { id: "world-1", prompt: "Quelle est la capitale de l’Australie ?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2, explanation: "C’est Canberra ! La ville a été choisie comme compromis entre les rivales Sydney et Melbourne.", category: "Tour du monde" },
  { id: "world-2", prompt: "Quel est le plus grand océan de notre planète ?", options: ["Atlantique", "Indien", "Arctique", "Pacifique"], correct: 3, explanation: "L’océan Pacifique recouvre environ un tiers de la surface de la Terre. Ça en fait, des longueurs !", category: "Tour du monde" },
  { id: "world-3", prompt: "Quelle ville s’étend sur deux continents ?", options: ["Istanbul", "Le Caire", "Athènes", "Lisbonne"], correct: 0, explanation: "Istanbul est à cheval entre l’Europe et l’Asie, de part et d’autre du Bosphore.", category: "Tour du monde" },
  { id: "world-4", prompt: "Quel pays arbore une feuille d’érable sur son drapeau ?", options: ["Japon", "Canada", "Suisse", "Nouvelle-Zélande"], correct: 1, explanation: "Le Canada ! La feuille d’érable à onze pointes figure sur son drapeau depuis 1965.", category: "Tour du monde" },
  { id: "world-5", prompt: "Dans quelle ville se trouve la Sagrada Família ?", options: ["Madrid", "Rome", "Barcelone", "Séville"], correct: 2, explanation: "La célèbre basilique d’Antoni Gaudí se trouve à Barcelone. Sa construction a commencé en 1882 !", category: "Tour du monde" },
  { id: "world-6", prompt: "Quel pays possède le plus de fuseaux horaires, outre-mer compris ?", options: ["Russie", "Chine", "États-Unis", "France"], correct: 3, explanation: "Avec ses territoires ultramarins, la France couvre 12 fuseaux horaires. Il est toujours l’heure de l’apéro quelque part !", category: "Tour du monde" },
];
const foodQuestions: Question[] = [
  { id: "food-1", prompt: "Quelle herbe est la star du pesto traditionnel ?", options: ["Persil", "Coriandre", "Basilic", "Menthe"], correct: 2, explanation: "Le pesto alla genovese se prépare avec du basilic frais, des pignons, de l’ail, de l’huile d’olive et du fromage.", category: "À table !" },
  { id: "food-2", prompt: "De quel pays vient le tiramisu ?", options: ["Espagne", "France", "Grèce", "Italie"], correct: 3, explanation: "Le tiramisu est italien. Son nom signifie littéralement « remonte-moi le moral ». Mission accomplie !", category: "À table !" },
  { id: "food-3", prompt: "Quel ingrédient donne sa couleur dorée à la paella traditionnelle ?", options: ["Curcuma", "Safran", "Paprika", "Curry"], correct: 1, explanation: "Le safran parfume et colore le riz de la paella. Cette épice vient des pistils d’une fleur de crocus.", category: "À table !" },
  { id: "food-4", prompt: "Quel est l’ingrédient principal du guacamole ?", options: ["Courgette", "Petit pois", "Avocat", "Concombre"], correct: 2, explanation: "L’avocat, bien sûr ! Le guacamole nous vient du Mexique et se partage… ou pas.", category: "À table !" },
  { id: "food-5", prompt: "Le mot « sushi » fait surtout référence à quoi ?", options: ["Au poisson cru", "Au riz vinaigré", "Aux algues", "À la sauce soja"], correct: 1, explanation: "Surprise : le sushi se définit par son riz vinaigré, pas par le poisson cru. Il peut même être végétarien !", category: "À table !" },
  { id: "food-6", prompt: "De quel pays vient l’ancêtre du croissant, le kipferl ?", options: ["France", "Belgique", "Autriche", "Suisse"], correct: 2, explanation: "Le kipferl est autrichien. Les boulangers français l’ont ensuite réinventé avec une pâte levée feuilletée.", category: "À table !" },
];

export const PACKS: QuizPack[] = [
  { id: "pop", title: "Pop culture", description: "Pour les pros de la référence.", image: asset("/images/pop-culture.svg"), color: "#9b75ed", icon: "gamepad", questions: popQuestions },
  { id: "world", title: "Tour du monde", description: "Le voyage, sans le décalage.", image: asset("/images/world.svg"), color: "#5dcab2", icon: "globe", questions: worldQuestions },
  { id: "food", title: "À table !", description: "À déguster sans modération.", image: asset("/images/food.svg"), color: "#f4a66d", icon: "food", questions: foodQuestions },
];
export const MIX_PACK: QuizPack = {
  id: "mix", title: "Le grand mélange", description: "Un peu de tout, beaucoup de fun.", image: asset("/images/quiz-universe.svg"), color: "#c6f36b", icon: "sparkles",
  questions: [popQuestions[0], worldQuestions[0], foodQuestions[0], popQuestions[2], worldQuestions[2], foodQuestions[4]],
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
  question: (Omit<Question, "correct" | "explanation"> & { correct?: number; explanation?: string }) | null;
  startedAt: string | null; remainingSeconds: number; players: RoomPlayer[]; answerCount: number;
  shopEnabled: boolean; votingEnabled: boolean; eliminated: number[];
  /** Durée de la question en secondes (0 = sans limite). */
  timeLimit: number;
  /** Média de la question suivante, réservé à l’hôte : permet de le précharger. */
  upcomingMedia?: QuestionMedia | null;
};
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

export function validateQuestions(value: unknown): value is Question[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 30 && value.every(q =>
    q && typeof q.id === "string" && typeof q.prompt === "string" && q.prompt.trim().length > 2 && q.prompt.length <= 500 &&
    Array.isArray(q.options) && q.options.length === 4 && q.options.every((o: unknown) => typeof o === "string" && o.trim().length > 0 && o.length <= 180) &&
    Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3 && typeof q.explanation === "string" && typeof q.category === "string" &&
    (q.media === undefined || validMedia(q.media)) &&
    (q.time === undefined || (Number.isInteger(q.time) && q.time >= 0 && q.time <= 600)) &&
    (!q.mediaUrl || (typeof q.mediaUrl === "string" && q.mediaUrl.length <= 4000000 && /^data:(image\/(png|jpeg|webp|gif)|audio\/(mpeg|mp3|wav|ogg|x-wav));base64,/.test(q.mediaUrl)))
  );
}
export const questionTime = (q?: Pick<Question, "time">) => q?.time === undefined ? QUESTION_TIME : q.time;
export function formatScore(score: number) { return new Intl.NumberFormat("fr-FR").format(score); }
