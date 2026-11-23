"use client";

import { useEffect, useRef, useState } from "react";
import { Disc3, ImageOff, LoaderCircle, Play, RotateCcw, Video } from "lucide-react";
import { clipKey, createClipDriver, type ClipDriver, type ClipState } from "@/lib/clip-driver";
import { clipSource, formatTime, type Question, type QuestionMedia } from "@/lib/game";

type MediaSource = Pick<Question, "media" | "mediaUrl" | "mediaType">;
const isClip = (m?: QuestionMedia | null): m is QuestionMedia => !!m && m.kind !== "photo" && !!clipSource(m.url);

function ClipLayer({ media, current, play, token, onState }: { media: QuestionMedia; current: boolean; play: boolean; token: number; onState: (state: ClipState) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const driver = useRef<ClipDriver | null>(null);
  const report = useRef(onState);
  report.current = onState;
  const key = clipKey(media);
  useEffect(() => {
    const created = host.current ? createClipDriver(host.current, media, { onState: state => report.current(state) }) : null;
    if (!created) report.current("error");
    driver.current = created;
    return () => { created?.destroy(); driver.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => { if (current && play) driver.current?.start(); else driver.current?.stop(); }, [current, play, token]);
  return <div ref={host} className={`clip-layer ${current ? "is-current" : ""} ${media.kind === "video" && clipSource(media.url)?.type === "youtube" ? "yt-crop" : ""}`} aria-hidden="true" />;
}

/**
 * Média d'une question.
 * - « stage » (écran de l'hôte, solo, éditeur) : photo, vidéo ou musique lues ici, préchargées à l'avance.
 * - « viewer » (téléphone des joueurs) : photo affichée ; vidéo et musique se suivent sur l'écran de l'hôte.
 * Les vidéos sont lues sans commandes, sans titre ni cliquables : seule l'image est visible.
 */
export default function QuestionMedia({ question, mode, autoplay, runKey, upcoming }: { question: MediaSource; mode: "stage" | "viewer"; autoplay: boolean; runKey: string; upcoming?: QuestionMedia | null }) {
  const media = question.media;
  const [manual, setManual] = useState(false);
  const [token, setToken] = useState(0);
  const [broken, setBroken] = useState(false);
  const [states, setStates] = useState<Record<string, ClipState>>({});
  useEffect(() => { setManual(false); setBroken(false); }, [runKey]);

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
  if (!isClip(media)) return <div className="media-card media-card-error"><ImageOff size={18} /><span>Lien invalide (YouTube ou fichier direct)</span></div>;

  const play = autoplay || manual;
  const currentKey = clipKey(media);
  const layers = [{ media, current: true }, ...(isClip(upcoming) && clipKey(upcoming) !== currentKey ? [{ media: upcoming, current: false }] : [])]
    .sort((a, b) => clipKey(a.media).localeCompare(clipKey(b.media)));
  const state = states[currentKey] ?? "loading";
  const length = media.end !== undefined ? media.end - (media.start ?? 0) : undefined;
  const busy = state === "loading";
  const canStart = !busy && state !== "error" && (state !== "playing");
  const replay = () => { setManual(true); setToken(t => t + 1); };
  const layerNodes = layers.map(l => <ClipLayer key={clipKey(l.media)} media={l.media} current={l.current} play={play} token={token} onState={s => setStates(all => all[clipKey(l.media)] === s ? all : { ...all, [clipKey(l.media)]: s })} />);

  return <div className={`media-stage ${isMusic ? "media-stage-music" : "media-stage-video"}`}>
    {isMusic ? <div className="clip-hidden">{layerNodes}</div> : <div className="clip-frame">{layerNodes}{state !== "playing" && state !== "ended" && <div className="clip-poster">{state === "error" ? <><ImageOff size={26} /><span>Vidéo indisponible</span></> : busy ? <><LoaderCircle size={26} className="spin" /><span>Chargement…</span></> : <button type="button" onClick={replay}><Play size={26} /><span>Lancer la vidéo</span></button>}</div>}</div>}
    {(isMusic || state === "error") && <div className={`media-card media-card-stage ${state === "error" ? "media-card-error" : ""}`}>
      {isMusic ? <span className={`media-eq ${state === "playing" ? "on" : ""}`}><i /><i /><i /><i /></span> : <Video size={20} />}
      <span>{state === "error" ? "Lecture impossible (vidéo non autorisée ou lien invalide)" : busy ? "Chargement de l’extrait…" : `Extrait musical${length ? ` · ${formatTime(length)}` : ""}`}</span>
      {isMusic && state !== "error" && <button type="button" className="button button-soft media-replay" disabled={busy} onClick={replay}>{busy ? <LoaderCircle size={14} className="spin" /> : canStart ? (state === "ended" || manual ? <RotateCcw size={14} /> : <Play size={14} />) : <RotateCcw size={14} />}{busy ? "Chargement" : state === "playing" || state === "ended" ? "Rejouer" : "Lancer"}</button>}
    </div>}
    {!isMusic && state === "ended" && <button type="button" className="button button-soft media-replay media-replay-video" onClick={replay}><RotateCcw size={14} /> Rejouer</button>}
  </div>;
}
