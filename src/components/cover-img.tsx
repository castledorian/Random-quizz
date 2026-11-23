"use client";

import { useEffect, useState } from "react";
import { COVERS } from "@/lib/covers";

/** Affiche une affiche de quiz ; si l'image est absente, une vignette colorée avec emoji prend le relais. */
export default function CoverImg({ src, coverId }: { src: string; coverId?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  const cover = COVERS.find(c => c.id === coverId);
  if (failed && cover) return <span className="cover-fallback" style={{ background: `linear-gradient(135deg, ${cover.from}, ${cover.to})` }}><span>{cover.emoji}</span></span>;
  return <img src={src} alt="" onError={() => setFailed(true)} />;
}
