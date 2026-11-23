import { ALL_PACKS, QUESTION_TIME, SHOP_ITEMS, type Question, type QuizPack, type RoomSnapshot, type RoomStatus } from "@/lib/game";
import { ApiError } from "@/lib/api-error";
import { readCustomPacks } from "@/lib/local-store";

/**
 * Moteur de salle exécuté dans le navigateur de l'hôte.
 * Il remplace l'ancienne API serveur : mêmes routes, mêmes règles, mêmes réponses.
 */
export { ApiError };
export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export type EnginePlayer = {
  id: string; token: string; profileId: string; name: string; avatar: number; score: number; coins: number;
  vote: string | null; doubleNext: boolean; shield: boolean; hint: boolean; joinedAt: number;
};
export type RoomState = {
  code: string; hostToken: string; status: RoomStatus; packId: string; packTitle: string; questions: Question[];
  questionIndex: number; questionStartedAt: number | null; remainingSeconds: number;
  shopEnabled: boolean; votingEnabled: boolean; players: EnginePlayer[]; answered: string[];
};
export type RpcRequest = { id: string; method: "GET" | "POST"; url: string; headers: Record<string, string>; body?: string };
export type RpcResponse = { id: string; status: number; data: unknown; serverTime: number };

const uuid = () => crypto.randomUUID();

export function newRoomState(code: string, questions: Question[], packTitle: string): RoomState {
  return {
    code, hostToken: uuid(), status: "lobby", packId: "mix", packTitle, questions, questionIndex: 0, questionStartedAt: null,
    remainingSeconds: QUESTION_TIME, shopEnabled: true, votingEnabled: true, players: [], answered: [],
  };
}

export function roomSnapshot(room: RoomState, hostToken?: string | null, playerToken?: string | null, omitMediaFor?: string | null): RoomSnapshot {
  const question = room.questions[room.questionIndex];
  const reveal = room.hostToken === hostToken || room.status === "revealed" || room.status === "finished";
  const me = room.players.find(p => p.token === playerToken);
  const key = (id: string) => `${id}:${room.questionIndex}`;
  const answered = new Set(room.answered);
  const sendMedia = question && question.mediaUrl && question.id !== omitMediaFor;
  return {
    code: room.code, status: room.status, packId: room.packId, packTitle: room.packTitle,
    questionIndex: room.questionIndex, totalQuestions: room.questions.length,
    question: question ? {
      id: question.id, prompt: question.prompt, options: question.options, category: question.category,
      ...(sendMedia ? { mediaUrl: question.mediaUrl } : {}), mediaType: question.mediaType,
      ...(reveal ? { correct: question.correct, explanation: question.explanation } : {}),
    } : null,
    startedAt: room.questionStartedAt ? new Date(room.questionStartedAt).toISOString() : null, remainingSeconds: room.remainingSeconds,
    players: [...room.players].sort((a, b) => a.joinedAt - b.joinedAt).map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, score: p.score, coins: p.coins, vote: p.vote,
      hasAnswered: answered.has(key(p.id)), doubleNext: p.doubleNext, shield: p.shield, hint: p.hint,
    })),
    answerCount: room.players.filter(p => answered.has(key(p.id))).length,
    shopEnabled: room.shopEnabled, votingEnabled: room.votingEnabled,
    eliminated: me?.hint && question ? question.options.map((_, i) => i).filter(i => i !== question.correct).slice(0, 2) : [],
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
    if (room.status !== "lobby") throw new ApiError("La partie a déjà commencé. Demandez à l’hôte de rouvrir le salon.");
    if (room.players.length >= 8) throw new ApiError("Le salon est complet : 8 joueurs maximum.");
    const player: EnginePlayer = {
      id: uuid(), token: uuid(), profileId: isUuid(body.profileId) ? body.profileId : uuid(), name, avatar, score: 0, coins: 150,
      vote: null, doubleNext: false, shield: false, hint: false, joinedAt: now,
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
    room.answered = [];
    room.players.forEach(p => { p.score = 0; p.coins = 150; p.doubleNext = false; p.shield = false; p.hint = false; });
    Object.assign(room, { status: "playing", packId: pack.id, packTitle: pack.title, questions: pack.questions, questionIndex: 0, remainingSeconds: QUESTION_TIME, questionStartedAt: now });
  } else if (action === "pause") {
    if (room.status !== "playing") throw new ApiError("La partie n’est pas en cours.");
    const elapsed = room.questionStartedAt ? (now - room.questionStartedAt) / 1000 : 0;
    Object.assign(room, { status: "paused", remainingSeconds: Math.max(1, Math.ceil(room.remainingSeconds - elapsed)), questionStartedAt: null });
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
    } else {
      room.players.forEach(p => { p.hint = false; });
      Object.assign(room, { status: "playing", questionIndex: room.questionIndex + 1, questionStartedAt: now, remainingSeconds: QUESTION_TIME });
    }
  } else if (action === "reset") {
    Object.assign(room, { status: "lobby", questionIndex: 0, questionStartedAt: null, remainingSeconds: QUESTION_TIME });
    room.players.forEach(p => { p.vote = null; });
  } else if (action === "award") {
    const amount = body.amount;
    if (!isUuid(body.playerId) || typeof amount !== "number" || !Number.isInteger(amount) || Math.abs(amount) > 1000) throw new ApiError("Ajustement de points invalide.");
    const player = room.players.find(p => p.id === body.playerId);
    if (player) player.score = Math.max(0, player.score + amount);
  } else if (action === "kick") {
    if (!isUuid(body.playerId)) throw new ApiError("Joueur invalide.");
    room.players = room.players.filter(p => p.id !== body.playerId);
  } else if (action === "settings") {
    if (typeof body.shopEnabled === "boolean") room.shopEnabled = body.shopEnabled;
    if (typeof body.votingEnabled === "boolean") room.votingEnabled = body.votingEnabled;
  } else if (action === "answer" || action === "vote" || action === "buy") {
    if (!isUuid(playerToken)) throw new ApiError("Rejoignez d’abord le salon.", 403);
    const player = room.players.find(p => p.token === playerToken);
    if (!player) throw new ApiError("Votre profil n’est plus dans ce salon.", 403);
    const answerKey = `${player.id}:${room.questionIndex}`;
    if (action === "vote") {
      if (!room.votingEnabled || room.status !== "lobby") throw new ApiError("Les votes sont fermés.");
      if (!ALL_PACKS.some(p => p.id === body.packId)) throw new ApiError("Thème inconnu.");
      player.vote = body.packId as string;
    } else if (action === "buy") {
      if (!room.shopEnabled || room.status === "finished" || room.status === "lobby") throw new ApiError("La boutique ouvre pendant la partie.");
      const item = SHOP_ITEMS.find(i => i.id === body.itemId);
      if (!item) throw new ApiError("Ce bonus n’existe pas.");
      const field = item.id === "double" ? "doubleNext" : item.id === "hint" ? "hint" : "shield";
      if (player[field]) throw new ApiError("Ce bonus est déjà actif !");
      if (player.coins < item.price) throw new ApiError("Il vous manque quelques pièces.");
      if (room.answered.includes(answerKey) && room.status === "playing") throw new ApiError("Vous avez déjà répondu. Gardez ce bonus pour la prochaine question.");
      player.coins -= item.price; player[field] = true;
    } else {
      if (room.status !== "playing" || !room.questionStartedAt) throw new ApiError("Attendez la prochaine question.");
      const remaining = room.remainingSeconds - (now - room.questionStartedAt) / 1000;
      if (remaining <= 0) throw new ApiError("Trop tard, le temps est écoulé !");
      const question = room.questions[room.questionIndex];
      const answerIndex = body.answerIndex;
      if (typeof answerIndex !== "number" || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) throw new ApiError("Réponse invalide.");
      if (room.answered.includes(answerKey)) throw new ApiError("Votre réponse est déjà enregistrée.");
      const right = answerIndex === question.correct;
      const points = right ? Math.round((500 + Math.min(1, remaining / QUESTION_TIME) * 500) * (player.doubleNext ? 2 : 1)) : player.shield ? 150 : 0;
      room.answered.push(answerKey);
      player.score += points; player.coins += right ? 80 : 10; player.doubleNext = false;
      if (!right) player.shield = false;
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
    const hostToken = req.headers["x-host-token"] ?? null;
    const playerToken = req.headers["x-player-token"] ?? null;
    const omitMediaFor = req.headers["x-media-have"] ?? null;
    if (req.method === "GET") return { status: 200, data: roomSnapshot(room, hostToken, playerToken, omitMediaFor) };
    let body: Record<string, unknown>;
    try { body = req.body ? JSON.parse(req.body) : {}; } catch { throw new ApiError("La requête n’est pas valide."); }
    const { result, changed } = applyAction(room, body.action, body, hostToken, playerToken);
    if (changed) persist(room);
    return { status: 200, data: result ?? roomSnapshot(room, hostToken, playerToken, omitMediaFor) };
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, data: { error: error.message } };
    console.error("Quizclub room error:", error);
    return { status: 500, data: { error: "Le salon est momentanément indisponible. Réessayez dans un instant." } };
  }
}
