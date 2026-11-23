import { ALL_PACKS, displayOptions, gradeAnswer, isScored, MAX_PLAYERS, orderSolution, QUESTION_TIME, qtype, questionTime, sanitizeAnswer, SHOP_ITEMS, type Answer, type Question, type QuestionStats, type QuizPack, type RoomSnapshot, type RoomStatus } from "@/lib/game";
import { ApiError } from "@/lib/api-error";
import { readCustomPacks, readHiddenBuiltIns } from "@/lib/local-store";
/** Thèmes d'origine encore présents dans la bibliothèque de l'hôte. */
const voteIds = () => { const hidden = readHiddenBuiltIns(); return ALL_PACKS.filter(p => !hidden.includes(p.id)).map(p => p.id); };
import { ensureProfile, recordGame, resolveProfileId, syncWallets } from "@/lib/profiles";

/**
 * Moteur de salle exécuté dans le navigateur de l'hôte.
 * Il remplace l'ancienne API serveur : mêmes routes, mêmes règles, mêmes réponses.
 */
export { ApiError };
export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export type EnginePlayer = {
  id: string; token: string; profileId: string; name: string; avatar: number; score: number; coins: number;
  vote: string | null; doubleNext: boolean; shield: boolean; hint: boolean; joinedAt: number; correct: number;
};
export type RoomState = {
  code: string; hostToken: string; status: RoomStatus; packId: string; packTitle: string; questions: Question[];
  questionIndex: number; questionStartedAt: number | null; remainingSeconds: number;
  shopEnabled: boolean; votingEnabled: boolean; players: EnginePlayer[]; answered: string[];
  /** Vidéos et musiques sur les téléphones (absent = activé). */
  phoneMedia?: boolean;
  /** Réponses de la partie en cours (clé : joueur:question). Absent dans les anciennes sauvegardes. */
  responses?: Record<string, { answer: Answer; right: boolean | null; points: number }>;
  /** Profils retirés par l’hôte (ne peuvent pas revenir) et jetons des joueurs retirés. */
  banned?: string[]; kicked?: string[];
  /** Salon remplacé par un nouveau code : il refuse toute requête. */
  closed?: boolean;
};
export type RpcRequest = { id: string; method: "GET" | "POST"; url: string; headers: Record<string, string>; body?: string };
export type RpcResponse = { id: string; status: number; data: unknown; serverTime: number };

const uuid = () => crypto.randomUUID();

export function newRoomState(code: string, questions: Question[], packTitle: string): RoomState {
  return {
    code, hostToken: uuid(), status: "lobby", packId: "mix", packTitle, questions, questionIndex: 0, questionStartedAt: null,
    remainingSeconds: QUESTION_TIME, shopEnabled: true, votingEnabled: true, players: [], answered: [], responses: {},
  };
}

function buildStats(room: RoomState, question: Question): QuestionStats {
  const t = qtype(question);
  const rows = room.players.map(p => ({ p, r: room.responses?.[`${p.id}:${room.questionIndex}`] })).filter((x): x is { p: EnginePlayer; r: NonNullable<typeof x.r> } => !!x.r);
  const stats: QuestionStats = { total: rows.length };
  if (isScored(question)) stats.right = rows.filter(x => x.r.right).length;
  if (t === "choice" || t === "truefalse" || t === "poll") { const c = question.options.map(() => 0); rows.forEach(x => { c[x.r.answer as number]++; }); stats.counts = c; }
  if (t === "multi") { const c = question.options.map(() => 0); rows.forEach(x => (x.r.answer as number[]).forEach(i => { c[i]++; })); stats.counts = c; }
  if (t === "scale") { const c = [0, 0, 0, 0, 0]; rows.forEach(x => { c[(x.r.answer as number) - 1]++; }); stats.counts = c; stats.avg = rows.length ? rows.reduce((n, x) => n + (x.r.answer as number), 0) / rows.length : 0; }
  if (t === "short" || t === "open" || t === "number") stats.texts = rows.map(x => ({ name: x.p.name, avatar: x.p.avatar, text: String(x.r.answer), ok: x.r.right }));
  return stats;
}

export function roomSnapshot(room: RoomState, hostToken?: string | null, playerToken?: string | null, omitMediaFor?: string | null): RoomSnapshot {
  const question = room.questions[room.questionIndex];
  const revealed = room.status === "revealed" || room.status === "finished";
  const reveal = room.hostToken === hostToken || revealed;
  const me = room.players.find(p => p.token === playerToken);
  const key = (id: string) => `${id}:${room.questionIndex}`;
  const answered = new Set(room.answered);
  const sendMedia = question && question.mediaUrl && question.id !== omitMediaFor;
  const mine = revealed && me && question ? room.responses?.[key(me.id)] : undefined;
  const t = question ? qtype(question) : "choice";
  return {
    code: room.code, status: room.status, packId: room.packId, packTitle: room.packTitle,
    questionIndex: room.questionIndex, totalQuestions: room.questions.length,
    question: question ? {
      id: question.id, prompt: question.prompt, options: displayOptions(question), category: question.category, type: question.type,
      ...(sendMedia ? { mediaUrl: question.mediaUrl } : {}), mediaType: question.mediaType, media: question.media,
      ...(reveal ? {
        explanation: question.explanation,
        ...(t === "choice" || t === "truefalse" ? { correct: question.correct } : {}),
        ...(t === "multi" ? { corrects: question.corrects } : {}),
        ...(t === "short" ? { answers: question.answers } : {}),
        ...(t === "number" ? { target: question.target, tolerance: question.tolerance } : {}),
        ...(t === "order" ? { solution: orderSolution(question) } : {}),
      } : {}),
    } : null,
    startedAt: room.questionStartedAt ? new Date(room.questionStartedAt).toISOString() : null, remainingSeconds: room.remainingSeconds,
    players: [...room.players].sort((a, b) => a.joinedAt - b.joinedAt).map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, score: p.score, coins: p.coins, vote: p.vote,
      hasAnswered: answered.has(key(p.id)), doubleNext: p.doubleNext, shield: p.shield, hint: p.hint,
    })),
    answerCount: room.players.filter(p => answered.has(key(p.id))).length,
    shopEnabled: room.shopEnabled, votingEnabled: room.votingEnabled, phoneMedia: room.phoneMedia !== false, votePacks: voteIds(),
    timeLimit: question ? questionTime(question) : QUESTION_TIME,
    ...(room.hostToken === hostToken ? { upcomingMedia: room.questions[room.questionIndex + 1]?.media ?? null } : {}),
    ...(revealed && question ? { stats: buildStats(room, question) } : {}),
    ...(mine ? { mine } : {}),
    ...(playerToken && room.kicked?.includes(playerToken) ? { kicked: true } : {}),
    eliminated: me?.hint && question && t === "choice" ? question.options.map((_, i) => i).filter(i => i !== question.correct).slice(0, 2) : [],
  };
}

function findPack(packId: string): QuizPack | undefined {
  const builtIn = ALL_PACKS.find(p => p.id === packId);
  if (builtIn) return builtIn;
  return readCustomPacks().find(p => p.id === packId);
}

/** Applique une commande. Renvoie true si l'état de la salle a changé. */
function applyAction(room: RoomState, action: unknown, body: Record<string, unknown>, hostToken: string | null, playerToken: string | null): { result?: unknown; changed: boolean } {
  const hostActions = ["start", "pause", "resume", "reveal", "next", "reset", "award", "settings", "kick"];
  if (typeof action === "string" && hostActions.includes(action) && hostToken !== room.hostToken) throw new ApiError("Cette commande est réservée au maître du jeu.", 403);
  const now = Date.now();

  if (action === "join") {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 24) : "";
    if (name.length < 2) throw new ApiError("Choisissez un pseudo d’au moins 2 caractères.");
    const rawAvatar = body.avatar;
    const avatar = typeof rawAvatar === "number" && Number.isInteger(rawAvatar) && rawAvatar >= 0 && rawAvatar < 8 ? rawAvatar : 0;
    if (isUuid(playerToken)) {
      const existing = room.players.find(p => p.token === playerToken);
      if (existing) return { result: { playerToken: existing.token, playerId: existing.id, profileId: existing.profileId, name: existing.name, avatar: existing.avatar, code: room.code }, changed: false };
    }
    const profileId = isUuid(body.profileId) ? resolveProfileId(body.profileId) : uuid();
    const same = room.players.find(p => p.profileId === profileId);
    if (room.banned?.includes(profileId)) throw new ApiError("Le maître du jeu vous a retiré de ce salon.", 403);
    if (same) return { result: { playerToken: same.token, playerId: same.id, profileId: same.profileId, name: same.name, avatar: same.avatar, code: room.code }, changed: false };
    if (room.status !== "lobby") throw new ApiError("La partie a déjà commencé. Demandez à l’hôte de rouvrir le salon.");
    if (room.players.length >= MAX_PLAYERS) throw new ApiError(`Le salon est complet : ${MAX_PLAYERS} joueurs maximum.`);
    const wallet = ensureProfile(profileId, name, avatar).coins;
    const player: EnginePlayer = {
      id: uuid(), token: uuid(), profileId, name, avatar, score: 0, coins: wallet,
      vote: null, doubleNext: false, shield: false, hint: false, joinedAt: now, correct: 0,
    };
    room.players.push(player);
    return { result: { playerToken: player.token, playerId: player.id, profileId: player.profileId, name: player.name, avatar: player.avatar, code: room.code }, changed: true };
  }

  if (action === "start") {
    let packId = typeof body.packId === "string" ? body.packId : "mix";
    if (!room.players.length) throw new ApiError("Invitez au moins un joueur, ou lancez le mode solo.");
    if (packId === "vote") {
      const votes = room.players.reduce<Record<string, number>>((all, p) => { if (p.vote) all[p.vote] = (all[p.vote] || 0) + 1; return all; }, {});
      packId = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] || "mix";
    }
    const pack = findPack(packId);
    if (!pack) throw new ApiError("Ce quiz n’existe plus.");
    room.answered = []; room.responses = {};
    room.players.forEach(p => { p.score = 0; p.correct = 0; p.doubleNext = false; p.shield = false; p.hint = false; });
    Object.assign(room, { status: "playing", packId: pack.id, packTitle: pack.title, questions: pack.questions, questionIndex: 0, remainingSeconds: questionTime(pack.questions[0]), questionStartedAt: now });
  } else if (action === "pause") {
    if (room.status !== "playing") throw new ApiError("La partie n’est pas en cours.");
    const elapsed = room.questionStartedAt ? (now - room.questionStartedAt) / 1000 : 0;
    const timed = questionTime(room.questions[room.questionIndex]) > 0;
    Object.assign(room, { status: "paused", remainingSeconds: timed ? Math.max(1, Math.ceil(room.remainingSeconds - elapsed)) : 0, questionStartedAt: null });
  } else if (action === "resume") {
    if (room.status !== "paused") throw new ApiError("La partie n’est pas en pause.");
    Object.assign(room, { status: "playing", questionStartedAt: now });
  } else if (action === "reveal") {
    if (room.status !== "playing" && room.status !== "paused") throw new ApiError("Cette question a déjà été révélée.");
    const elapsed = room.status === "playing" && room.questionStartedAt ? (now - room.questionStartedAt) / 1000 : 0;
    Object.assign(room, { status: "revealed", remainingSeconds: Math.max(0, Math.ceil(room.remainingSeconds - elapsed)) });
  } else if (action === "next") {
    if (room.status !== "revealed") throw new ApiError("Révélez d’abord la bonne réponse.");
    if (room.questionIndex >= room.questions.length - 1) {
      Object.assign(room, { status: "finished", questionStartedAt: null });
      recordGame(room.players.map(p => ({ ...p, correct: p.correct ?? 0 })), room.questions.filter(isScored).length || 1);
    } else {
      room.players.forEach(p => { p.hint = false; });
      Object.assign(room, { status: "playing", questionIndex: room.questionIndex + 1, questionStartedAt: now, remainingSeconds: questionTime(room.questions[room.questionIndex + 1]) });
    }
  } else if (action === "reset") {
    Object.assign(room, { status: "lobby", questionIndex: 0, questionStartedAt: null, remainingSeconds: QUESTION_TIME });
    room.players.forEach(p => { p.vote = null; });
  } else if (action === "award") {
    const amount = body.amount;
    if (!isUuid(body.playerId) || typeof amount !== "number" || !Number.isInteger(amount) || Math.abs(amount) > 1_000_000) throw new ApiError("Ajustement invalide.");
    const player = room.players.find(p => p.id === body.playerId);
    if (player) { if (body.field === "coins") player.coins = Math.max(0, player.coins + amount); else player.score = Math.max(0, player.score + amount); }
  } else if (action === "kick") {
    if (!isUuid(body.playerId)) throw new ApiError("Joueur invalide.");
    const target = room.players.find(p => p.id === body.playerId);
    if (target) { (room.banned ??= []).push(target.profileId); (room.kicked ??= []).push(target.token); }
    room.players = room.players.filter(p => p.id !== body.playerId);
  } else if (action === "settings") {
    if (typeof body.shopEnabled === "boolean") room.shopEnabled = body.shopEnabled;
    if (typeof body.votingEnabled === "boolean") room.votingEnabled = body.votingEnabled;
    if (typeof body.phoneMedia === "boolean") room.phoneMedia = body.phoneMedia;
  } else if (action === "answer" || action === "vote" || action === "buy") {
    if (!isUuid(playerToken)) throw new ApiError("Rejoignez d’abord le salon.", 403);
    const player = room.players.find(p => p.token === playerToken);
    if (!player) throw new ApiError("Votre profil n’est plus dans ce salon.", 403);
    const answerKey = `${player.id}:${room.questionIndex}`;
    if (action === "vote") {
      if (!room.votingEnabled || room.status !== "lobby") throw new ApiError("Les votes sont fermés.");
      if (!voteIds().includes(body.packId as string)) throw new ApiError("Thème inconnu.");
      player.vote = body.packId as string;
    } else if (action === "buy") {
      if (!room.shopEnabled || room.status === "finished" || room.status === "lobby") throw new ApiError("La boutique ouvre pendant la partie.");
      const item = SHOP_ITEMS.find(i => i.id === body.itemId);
      if (!item) throw new ApiError("Ce bonus n’existe pas.");
      const field = item.id === "double" ? "doubleNext" : item.id === "hint" ? "hint" : "shield";
      if (player[field]) throw new ApiError("Ce bonus est déjà actif !");
      if (item.id === "hint" && room.status === "playing" && qtype(room.questions[room.questionIndex]) !== "choice") throw new ApiError("Le 50 / 50 ne fonctionne que sur les choix multiples.");
      if (player.coins < item.price) throw new ApiError("Il vous manque quelques pièces.");
      if (room.answered.includes(answerKey) && room.status === "playing") throw new ApiError("Vous avez déjà répondu. Gardez ce bonus pour la prochaine question.");
      player.coins -= item.price; player[field] = true;
    } else {
      if (room.status !== "playing" || !room.questionStartedAt) throw new ApiError("Attendez la prochaine question.");
      const question = room.questions[room.questionIndex];
      const limit = questionTime(question);
      const remaining = room.remainingSeconds - (now - room.questionStartedAt) / 1000;
      if (limit > 0 && remaining <= 0) throw new ApiError("Trop tard, le temps est écoulé !");
      const answer = sanitizeAnswer(question, body.answer !== undefined ? body.answer : body.answerIndex);
      if (answer === null) throw new ApiError("Réponse invalide.");
      if (room.answered.includes(answerKey)) throw new ApiError("Votre réponse est déjà enregistrée.");
      const right = gradeAnswer(question, answer);
      const points = right === null ? 0 : right ? Math.round((500 + (limit > 0 ? Math.min(1, remaining / limit) : 0.5) * 500) * (player.doubleNext ? 2 : 1)) : player.shield ? 150 : 0;
      room.answered.push(answerKey);
      (room.responses ??= {})[answerKey] = { answer, right, points };
      player.score += points; player.coins += right ? 80 : 10;
      if (right !== null) { player.doubleNext = false; if (right) player.correct = (player.correct ?? 0) + 1; else player.shield = false; }
    }
  } else {
    throw new ApiError("Commande inconnue.");
  }
  return { changed: true };
}

/** Traite une requête (locale ou reçue d'un joueur) sur la salle de l'hôte. */
export function handleRoomRequest(room: RoomState, req: RpcRequest, persist: (room: RoomState) => void): { status: number; data: unknown } {
  try {
    const url = new URL(req.url, "http://local");
    const fromPath = decodeURIComponent(url.pathname.split("/").filter(Boolean)[2] || "");
    const code = (fromPath || url.searchParams.get("code") || "").toUpperCase();
    if (!code) throw new ApiError("Indiquez le code du salon.");
    if (!/^[A-Z0-9]{4,6}$/.test(code)) throw new ApiError("Ce code de salon n’est pas valide.", 404);
    if (code !== room.code) throw new ApiError("Ce salon est introuvable. Vérifiez votre code.", 404);
    if (room.closed) throw new ApiError("Ce salon a été fermé : le maître du jeu a généré un nouveau code. Demandez-le lui.", 410);
    const hostToken = req.headers["x-host-token"] ?? null;
    const playerToken = req.headers["x-player-token"] ?? null;
    const omitMediaFor = req.headers["x-media-have"] ?? null;
    if (req.method === "GET") return { status: 200, data: roomSnapshot(room, hostToken, playerToken, omitMediaFor) };
    let body: Record<string, unknown>;
    try { body = req.body ? JSON.parse(req.body) : {}; } catch { throw new ApiError("La requête n’est pas valide."); }
    const { result, changed } = applyAction(room, body.action, body, hostToken, playerToken);
    if (changed) { syncWallets(room.players.map(p => ({ ...p, correct: p.correct ?? 0 }))); persist(room); }
    return { status: 200, data: result ?? roomSnapshot(room, hostToken, playerToken, omitMediaFor) };
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, data: { error: error.message } };
    console.error("Quizclub room error:", error);
    return { status: 500, data: { error: "Le salon est momentanément indisponible. Réessayez dans un instant." } };
  }
}
