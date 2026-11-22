import { db } from "@/db";
import { scores } from "@/db/schema";
import { ApiError, handleApiError } from "@/lib/room-server";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const rows = await db.select().from(scores).orderBy(desc(scores.score)).limit(30);
    return NextResponse.json(rows.map(r => ({ id: r.id, name: r.name, score: r.score, correct: r.correct, total: r.total, packName: r.packName, date: r.createdAt.toISOString() })));
  } catch (error) { return handleApiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 24 || !Number.isInteger(body.score) || body.score < 0 || body.score > 120000 || !Number.isInteger(body.total) || body.total < 1 || body.total > 30 || !Number.isInteger(body.correct) || body.correct < 0 || body.correct > body.total || typeof body.packName !== "string") throw new ApiError("Ce score n’est pas valide.");
    const [saved] = await db.insert(scores).values({ name: body.name.trim(), score: body.score, correct: body.correct, total: body.total, packName: body.packName.slice(0, 80) }).returning();
    return NextResponse.json({ id: saved.id }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
