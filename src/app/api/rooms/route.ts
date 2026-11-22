import { randomInt } from "node:crypto";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { MIX_PACK } from "@/lib/game";
import { ApiError, handleApiError, roomSnapshot } from "@/lib/room-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code")?.toUpperCase();
    if (!code) throw new ApiError("Indiquez le code du salon.");
    return NextResponse.json(await roomSnapshot(code, request.headers.get("x-host-token"), request.headers.get("x-player-token")));
  } catch (error) { return handleApiError(error); }
}
export async function POST() {
  try {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
      const [room] = await db.insert(rooms).values({ code, questions: MIX_PACK.questions }).onConflictDoNothing().returning();
      if (room) return NextResponse.json({ code: room.code, hostToken: room.hostToken }, { status: 201 });
    }
    throw new ApiError("Un peu trop de monde sur le plateau ! Réessayez.", 503);
  } catch (error) { return handleApiError(error); }
}
