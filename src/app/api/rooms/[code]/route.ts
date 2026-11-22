import { db } from "@/db";
import { answers, players, profiles, quizzes, rooms } from "@/db/schema";
import { ALL_PACKS, QUESTION_TIME, SHOP_ITEMS } from "@/lib/game";
import { ApiError, getRoom, handleApiError, isUuid, roomSnapshot } from "@/lib/room-server";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const room = await getRoom(code);
    const body = await request.json();
    const action = body.action;
    const hostToken = request.headers.get("x-host-token");
    const playerToken = request.headers.get("x-player-token");
    const hostActions = ["start", "pause", "resume", "reveal", "next", "reset", "award", "settings", "kick"];
    if (hostActions.includes(action) && hostToken !== room.hostToken) throw new ApiError("Cette commande est réservée au maître du jeu.", 403);

    if (action === "join") {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 24) : "";
      if (name.length < 2) throw new ApiError("Choisissez un pseudo d’au moins 2 caractères.");
      const avatar = Number.isInteger(body.avatar) && body.avatar >= 0 && body.avatar < 8 ? body.avatar : 0;
      const result = await db.transaction(async tx => {
        const [locked] = await tx.select().from(rooms).where(eq(rooms.id, room.id)).for("update");
        if (isUuid(playerToken)) {
          const [existing] = await tx.select().from(players).where(and(eq(players.roomId, room.id), eq(players.token, playerToken)));
          if (existing) return existing;
        }
        if (locked.status !== "lobby") throw new ApiError("La partie a déjà commencé. Demandez à l’hôte de rouvrir le salon.");
        const members = await tx.select({ id: players.id }).from(players).where(eq(players.roomId, room.id));
        if (members.length >= 8) throw new ApiError("Le salon est complet : 8 joueurs maximum.");
        let profileId: string | undefined;
        if (isUuid(body.profileId)) {
          const [saved] = await tx.select().from(profiles).where(eq(profiles.id, body.profileId));
          if (saved) profileId = saved.id;
        }
        if (!profileId) {
          const [profile] = await tx.insert(profiles).values({ name, avatar }).returning();
          profileId = profile.id;
        }
        const [player] = await tx.insert(players).values({ roomId: room.id, profileId, name, avatar }).returning();
        return player;
      });
      return NextResponse.json({ playerToken: result.token, playerId: result.id, profileId: result.profileId, name: result.name, avatar: result.avatar, code });
    }

    if (action === "start") {
      let packId = typeof body.packId === "string" ? body.packId : "mix";
      const members = await db.select().from(players).where(eq(players.roomId, room.id));
      if (!members.length) throw new ApiError("Invitez au moins un joueur, ou lancez le mode solo.");
      if (packId === "vote") {
        const votes = members.reduce<Record<string, number>>((all, p) => { if (p.vote) all[p.vote] = (all[p.vote] || 0) + 1; return all; }, {});
        packId = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] || "mix";
      }
      let pack = ALL_PACKS.find(p => p.id === packId);
      if (!pack && isUuid(packId)) {
        const [custom] = await db.select().from(quizzes).where(eq(quizzes.id, packId));
        if (custom) pack = { ...custom, image: "/images/quiz-universe.png", color: "#b99aef", icon: "sparkles" };
      }
      if (!pack) throw new ApiError("Ce quiz n’existe plus.");
      await db.transaction(async tx => {
        await tx.delete(answers).where(eq(answers.roomId, room.id));
        await tx.update(players).set({ score: 0, coins: 150, doubleNext: false, shield: false, hint: false }).where(eq(players.roomId, room.id));
        await tx.update(rooms).set({ status: "playing", packId: pack.id, packTitle: pack.title, questions: pack.questions, questionIndex: 0, remainingSeconds: QUESTION_TIME, questionStartedAt: new Date() }).where(eq(rooms.id, room.id));
      });
    } else if (action === "pause") {
      if (room.status !== "playing") throw new ApiError("La partie n’est pas en cours.");
      const elapsed = room.questionStartedAt ? (Date.now() - room.questionStartedAt.getTime()) / 1000 : 0;
      await db.update(rooms).set({ status: "paused", remainingSeconds: Math.max(1, Math.ceil(room.remainingSeconds - elapsed)), questionStartedAt: null }).where(eq(rooms.id, room.id));
    } else if (action === "resume") {
      if (room.status !== "paused") throw new ApiError("La partie n’est pas en pause.");
      await db.update(rooms).set({ status: "playing", questionStartedAt: new Date() }).where(eq(rooms.id, room.id));
    } else if (action === "reveal") {
      if (room.status !== "playing" && room.status !== "paused") throw new ApiError("Cette question a déjà été révélée.");
      const elapsed = room.status === "playing" && room.questionStartedAt ? (Date.now() - room.questionStartedAt.getTime()) / 1000 : 0;
      await db.update(rooms).set({ status: "revealed", remainingSeconds: Math.max(0, Math.ceil(room.remainingSeconds - elapsed)) }).where(eq(rooms.id, room.id));
    } else if (action === "next") {
      await db.transaction(async tx => {
        const [current] = await tx.select().from(rooms).where(eq(rooms.id, room.id)).for("update");
        if (current.status !== "revealed") throw new ApiError("Révélez d’abord la bonne réponse.");
        if (current.questionIndex >= current.questions.length - 1) {
          await tx.update(rooms).set({ status: "finished", questionStartedAt: null }).where(eq(rooms.id, room.id));
          const members = await tx.select().from(players).where(eq(players.roomId, room.id));
          for (const p of members) await tx.update(profiles).set({ totalScore: sql`${profiles.totalScore} + ${p.score}`, gamesPlayed: sql`${profiles.gamesPlayed} + 1`, name: p.name, avatar: p.avatar }).where(eq(profiles.id, p.profileId));
        } else {
          await tx.update(players).set({ hint: false }).where(eq(players.roomId, room.id));
          await tx.update(rooms).set({ status: "playing", questionIndex: current.questionIndex + 1, questionStartedAt: new Date(), remainingSeconds: QUESTION_TIME }).where(eq(rooms.id, room.id));
        }
      });
    } else if (action === "reset") {
      await db.update(rooms).set({ status: "lobby", questionIndex: 0, questionStartedAt: null, remainingSeconds: QUESTION_TIME }).where(eq(rooms.id, room.id));
      await db.update(players).set({ vote: null }).where(eq(players.roomId, room.id));
    } else if (action === "award") {
      if (!isUuid(body.playerId) || !Number.isInteger(body.amount) || Math.abs(body.amount) > 1000) throw new ApiError("Ajustement de points invalide.");
      await db.update(players).set({ score: sql`greatest(0, ${players.score} + ${body.amount})` }).where(and(eq(players.roomId, room.id), eq(players.id, body.playerId)));
    } else if (action === "kick") {
      if (!isUuid(body.playerId)) throw new ApiError("Joueur invalide.");
      await db.delete(players).where(and(eq(players.roomId, room.id), eq(players.id, body.playerId)));
    } else if (action === "settings") {
      await db.update(rooms).set({ ...(typeof body.shopEnabled === "boolean" ? { shopEnabled: body.shopEnabled } : {}), ...(typeof body.votingEnabled === "boolean" ? { votingEnabled: body.votingEnabled } : {}) }).where(eq(rooms.id, room.id));
    } else if (["answer", "vote", "buy"].includes(action)) {
      if (!isUuid(playerToken)) throw new ApiError("Rejoignez d’abord le salon.", 403);
      await db.transaction(async tx => {
        const [current] = await tx.select().from(rooms).where(eq(rooms.id, room.id)).for("update");
        const [player] = await tx.select().from(players).where(and(eq(players.roomId, room.id), eq(players.token, playerToken))).for("update");
        if (!player) throw new ApiError("Votre profil n’est plus dans ce salon.", 403);
        if (action === "vote") {
          if (!current.votingEnabled || current.status !== "lobby") throw new ApiError("Les votes sont fermés.");
          if (!ALL_PACKS.some(p => p.id === body.packId)) throw new ApiError("Thème inconnu.");
          await tx.update(players).set({ vote: body.packId }).where(eq(players.id, player.id));
        } else if (action === "buy") {
          if (!current.shopEnabled || current.status === "finished" || current.status === "lobby") throw new ApiError("La boutique ouvre pendant la partie.");
          const item = SHOP_ITEMS.find(i => i.id === body.itemId);
          if (!item) throw new ApiError("Ce bonus n’existe pas.");
          const field = item.id === "double" ? "doubleNext" : item.id === "hint" ? "hint" : "shield";
          if (player[field]) throw new ApiError("Ce bonus est déjà actif !");
          if (player.coins < item.price) throw new ApiError("Il vous manque quelques pièces.");
          const [submitted] = await tx.select({ id: answers.id }).from(answers).where(and(eq(answers.roomId, room.id), eq(answers.playerId, player.id), eq(answers.questionIndex, current.questionIndex)));
          if (submitted && current.status === "playing") throw new ApiError("Vous avez déjà répondu. Gardez ce bonus pour la prochaine question.");
          await tx.update(players).set({ coins: player.coins - item.price, [field]: true }).where(eq(players.id, player.id));
        } else {
          if (current.status !== "playing" || !current.questionStartedAt) throw new ApiError("Attendez la prochaine question.");
          const remaining = current.remainingSeconds - (Date.now() - current.questionStartedAt.getTime()) / 1000;
          if (remaining <= 0) throw new ApiError("Trop tard, le temps est écoulé !");
          const question = current.questions[current.questionIndex];
          if (!Number.isInteger(body.answerIndex) || body.answerIndex < 0 || body.answerIndex > 3) throw new ApiError("Réponse invalide.");
          const right = body.answerIndex === question.correct;
          const points = right ? Math.round((500 + Math.min(1, remaining / QUESTION_TIME) * 500) * (player.doubleNext ? 2 : 1)) : player.shield ? 150 : 0;
          const [saved] = await tx.insert(answers).values({ roomId: room.id, playerId: player.id, questionIndex: current.questionIndex, answerIndex: body.answerIndex, points }).onConflictDoNothing().returning();
          if (!saved) throw new ApiError("Votre réponse est déjà enregistrée.");
          await tx.update(players).set({ score: sql`${players.score} + ${points}`, coins: sql`${players.coins} + ${right ? 80 : 10}`, doubleNext: false, ...(!right ? { shield: false } : {}) }).where(eq(players.id, player.id));
        }
      });
    } else {
      throw new ApiError("Commande inconnue.");
    }
    return NextResponse.json(await roomSnapshot(code, hostToken, playerToken));
  } catch (error) { return handleApiError(error); }
}
