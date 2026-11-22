import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { validateQuestions } from "@/lib/game";
import { ApiError, handleApiError } from "@/lib/room-server";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const packs = await db.select().from(quizzes).orderBy(desc(quizzes.createdAt)).limit(50);
    return NextResponse.json(packs.map(p => ({ ...p, image: "/images/quiz-universe.png", color: "#b99aef", icon: "sparkles", custom: true })));
  } catch (error) { return handleApiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.length > 80) throw new ApiError("Le titre doit contenir entre 3 et 80 caractères.");
    if (!validateQuestions(body.questions)) throw new ApiError("Chaque question doit avoir un énoncé, quatre réponses et une bonne réponse. Vérifiez aussi le format des médias.");
    const [pack] = await db.insert(quizzes).values({ title: body.title.trim(), description: typeof body.description === "string" ? body.description.trim().slice(0, 200) : undefined, questions: body.questions }).returning();
    return NextResponse.json({ ...pack, image: "/images/quiz-universe.png", color: "#b99aef", icon: "sparkles", custom: true }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
