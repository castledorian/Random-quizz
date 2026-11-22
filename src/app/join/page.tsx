import type { Metadata } from "next";
import JoinGame from "@/components/join-game";

export const metadata: Metadata = { title: "Rejoindre la bande · quizclub" };
export default function JoinPage() { return <JoinGame />; }
