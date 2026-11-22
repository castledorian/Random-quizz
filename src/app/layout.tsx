import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "quizclub — Votre soirée. Vos règles.",
  description: "Le quiz qui transforme votre salon en plateau télé. Créez votre partie, invitez la bande par QR code et prenez les commandes. Solo ou multijoueur, sans installation.",
  applicationName: "quizclub",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>;
}
