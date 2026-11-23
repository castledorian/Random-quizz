"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { BASE } from "@/lib/base";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Enregistre le service worker (hors ligne + mises à jour automatiques). */
export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
  navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).then(reg => {
    // Vérifie les mises à jour à chaque ouverture et toutes les heures.
    void reg.update();
    window.setInterval(() => void reg.update(), 3600_000);
  }).catch(() => { /* Le site fonctionne aussi sans. */ });
}

/** Bouton « Installer l’application » ; s’efface une fois l’app installée. */
export default function AppInstallButton({ className, onIosHelp }: { className?: string; onIosHelp: () => void }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    registerServiceWorker();
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (installed || (!prompt && !ios)) return null;
  return <button className={className} onClick={async () => {
    if (prompt) { await prompt.prompt(); const { outcome } = await prompt.userChoice; if (outcome === "accepted") setInstalled(true); setPrompt(null); }
    else onIosHelp();
  }}><Download size={18} strokeWidth={1.7} /><span>Installer l’application</span></button>;
}
