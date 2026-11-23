"use client";

import { useEffect, useState } from "react";
import { Disc3, ImageOff, Play, RotateCcw, Video } from "lucide-react";
import { formatTime, youtubeId, type Question } from "@/lib/game";

type MediaSource = Pick<Question, "media" | "mediaUrl" | "mediaType">;

/**
 * Affiche le média d'une question.
 * - "stage" (écran de l'hôte, solo, aperçu de l'éditeur) : photo, vidéo ou musique jouées ici.
 * - "viewer" (téléphone des joueurs) : photo affichée ; vidéo et musique se suivent sur l'écran de l'hôte.
 */
export default function QuestionMedia({ question, mode, autoplay, runKey }: { question: MediaSource; mode: "stage" | "viewer"; autoplay: boolean; runKey: string }) {
  const media = question.media;
  const [playing, setPlaying] = useState(autoplay);
  const [nonce, setNonce] = useState(0);
  const [broken, setBroken] = useState(false);
  useEffect(() => { setPlaying(autoplay); setNonce(n => n + 1); setBroken(false); }, [runKey, autoplay]);

  if (!media) {
    if (!question.mediaUrl) return null;
    return question.mediaType === "audio"
      ? (mode === "stage" ? <audio src={question.mediaUrl} controls className="question-audio" /> : null)
      : <img src={question.mediaUrl} className="question-image" alt="Illustration de la question" />;
  }
  if (media.kind === "photo") {
    if (broken) return <div className="media-card media-card-error"><ImageOff size={18} /><span>Image introuvable</span></div>;
    return <img src={media.url} className="question-image" alt="Illustration de la question" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  }
  const isMusic = media.kind === "music";
  if (mode === "viewer") {
    return <div className="media-card">{isMusic ? <Disc3 size={20} /> : <Video size={20} />}<span>{isMusic ? "Musique : écoutez l’écran de l’hôte" : "Vidéo : regardez l’écran de l’hôte"}</span></div>;
  }
  const id = youtubeId(media.url);
  if (!id) return <div className="media-card media-card-error"><ImageOff size={18} /><span>Lien YouTube invalide</span></div>;
  const params = new URLSearchParams({ autoplay: "1", controls: isMusic ? "0" : "1", rel: "0", modestbranding: "1", playsinline: "1", iv_load_policy: "3", fs: "0" });
  if (media.start) params.set("start", String(media.start));
  if (media.end) params.set("end", String(media.end));
  const src = `https://www.youtube-nocookie.com/embed/${id}?${params}`;
  const length = media.end !== undefined ? media.end - (media.start ?? 0) : undefined;
  return <div className={`media-stage ${isMusic ? "media-stage-music" : "media-stage-video"}`}>
    {playing && <iframe key={nonce} className={isMusic ? "media-audio-frame" : "question-video"} src={src} title={isMusic ? "Extrait musical" : "Extrait vidéo"} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />}
    {(isMusic || !playing) && <div className="media-card media-card-stage">
      {isMusic ? <span className={`media-eq ${playing ? "on" : ""}`}><i /><i /><i /><i /></span> : <Video size={20} />}
      <span>{isMusic ? "Extrait musical" : "Extrait vidéo"}{length ? ` · ${formatTime(length)}` : ""}</span>
      <button type="button" className="button button-soft media-replay" onClick={() => { setPlaying(true); setNonce(n => n + 1); }}>{playing ? <RotateCcw size={14} /> : <Play size={14} />}{playing ? "Rejouer" : "Lancer"}</button>
    </div>}
  </div>;
}
