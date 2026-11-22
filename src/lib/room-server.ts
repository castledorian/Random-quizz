import { db } from "@/db";
import { answers, players, rooms } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { RoomSnapshot, RoomStatus } from "@/lib/game";

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export async function getRoom(code: string) {
  if (!/^[A-Z0-9]{4,6}$/.test(code)) throw new ApiError("Ce code de salon n’est pas valide.", 404);
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room) throw new ApiError("Ce salon est introuvable. Vérifiez votre code.", 404);
  return room;
}
export async function roomSnapshot(code: string, hostToken?: string | null, playerToken?: string | null): Promise<RoomSnapshot> {
  const room = await getRoom(code);
  const members = await db.select().from(players).where(eq(players.roomId, room.id)).orderBy(asc(players.joinedAt));
  const submitted = await db.select({ playerId: answers.playerId }).from(answers).where(and(eq(answers.roomId, room.id), eq(answers.questionIndex, room.questionIndex)));
  const answered = new Set(submitted.map(a => a.playerId));
  const question = room.questions[room.questionIndex];
  const reveal = room.hostToken === hostToken || room.status === "revealed" || room.status === "finished";
  const me = members.find(p => p.token === playerToken);
  return {
    code: room.code, status: room.status as RoomStatus, packId: room.packId, packTitle: room.packTitle,
    questionIndex: room.questionIndex, totalQuestions: room.questions.length,
    question: question ? { id: question.id, prompt: question.prompt, options: question.options, category: question.category, mediaUrl: question.mediaUrl, mediaType: question.mediaType, ...(reveal ? { correct: question.correct, explanation: question.explanation } : {}) } : null,
    startedAt: room.questionStartedAt?.toISOString() ?? null, remainingSeconds: room.remainingSeconds,
    players: members.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, coins: p.coins, vote: p.vote, hasAnswered: answered.has(p.id), doubleNext: p.doubleNext, shield: p.shield, hint: p.hint })),
    answerCount: submitted.length, shopEnabled: room.shopEnabled, votingEnabled: room.votingEnabled,
    eliminated: me?.hint && question ? question.options.map((_, i) => i).filter(i => i !== question.correct).slice(0, 2) : [],
  };
}
export function handleApiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "La requête n’est pas valide." }, { status: 400 });
  console.error("Quizclub API error:", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Le salon est momentanément indisponible. Réessayez dans un instant." }, { status: 500 });
}
