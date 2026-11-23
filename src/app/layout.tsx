import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "quizclub — Votre soirée. Vos règles.",
  description: "Le quiz qui transforme votre salon en plateau télé. Créez votre partie, invitez la bande par QR code et prenez les commandes. Solo ou multijoueur, sans installation.",
  applicationName: "Random Quizz",
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "Random Quizz", statusBarStyle: "black-translucent" },
  icons: { apple: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icons/apple-touch-icon.png` },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#11121b" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>;
}
