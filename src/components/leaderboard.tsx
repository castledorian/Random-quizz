"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Crown, Globe2, HardDrive, Trophy } from "lucide-react";
import { AVATARS, AVATAR_COLORS, formatScore, type HighScore } from "@/lib/game";
import { api } from "@/lib/client";

export default function Leaderboard({ localScores, onPlay }: { localScores: HighScore[]; onPlay: () => void }) {
  const [tab, setTab] = useState("local");
  const [globalScores, setGlobalScores] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (tab !== "global") return;
    setLoading(true); setError("");
    void api<HighScore[]>("/api/scores").then(setGlobalScores).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [tab]);
  const rows = tab === "local" ? localScores : globalScores;
  return <div className="leaderboard-view"><div className="section-page-heading"><div><span className="eyebrow">LE CLASSEMENT</span><h1>Les points parlent d’eux-mêmes.</h1><p>Les grandes victoires méritent une petite place au soleil.</p></div><div className="leaderboard-heading-icon"><Trophy size={32} /></div></div><div className="filter-tabs leaderboard-tabs"><button className={tab === "local" ? "active" : ""} onClick={() => setTab("local")}><HardDrive size={15} /> Sur ce navigateur</button><button className={tab === "global" ? "active" : ""} onClick={() => setTab("global")}><Globe2 size={15} /> Tout le club</button></div>{loading ? <div className="empty-state"><span className="loading-ring" /><p>On compte les points…</p></div> : error ? <div className="empty-state"><p className="form-error">{error}</p><button className="button button-ghost" onClick={() => { setTab("local"); }}>Voir mes scores locaux</button></div> : !rows.length ? <div className="empty-state leaderboard-empty"><div className="empty-trophy"><Crown size={44} /></div><span className="eyebrow lime">UNE PLACE DANS LA LÉGENDE</span><h2>Le trône est encore libre.</h2><p>Une partie suffit pour inscrire votre nom au tableau.<br />La pression ? Quelle pression ?</p><button className="button button-primary" onClick={onPlay}>Décrocher la première place<ArrowRight size={17} /></button></div> : <><div className="top-score-cards">{rows.slice(0, 3).map((row, i) => <div className={`top-score-card top-score-${i}`} key={row.id}><span className="top-score-rank">{i === 0 ? <Crown size={20} /> : `0${i + 1}`}</span><span className="player-avatar" style={{ background: AVATAR_COLORS[i] }}>{AVATARS[i]}</span><h2>{row.name}</h2><strong>{formatScore(row.score)} <small>pts</small></strong><p>{row.packName}</p></div>)}</div><div className="score-table"><div className="score-table-header"><span>RANG</span><span>JOUEUR / JOUEUSE</span><span>QUIZ</span><span>RÉUSSITE</span><span>POINTS</span></div>{rows.map((row, i) => <div className={`score-table-row ${i === 0 ? "score-table-first" : ""}`} key={row.id}><span className="rank">{i === 0 ? <Crown size={18} /> : String(i + 1).padStart(2, "0")}</span><span className="score-player"><span className="player-avatar" style={{ background: AVATAR_COLORS[i % 8] }}>{AVATARS[i % 8]}</span><span><strong>{row.name}</strong><small>{new Date(row.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</small></span></span><span className="score-pack">{row.packName}</span><span className="score-accuracy">{row.correct}/{row.total}<span className="accuracy-bar"><i style={{ width: `${row.correct / row.total * 100}%` }} /></span></span><strong className="score-points">{formatScore(row.score)} <small>pts</small></strong></div>)}</div><p className="leaderboard-footnote">{tab === "local" ? "Vos 20 meilleurs scores sont conservés sur ce navigateur. Pas de compte, juste du talent." : "Les meilleures parties solo du club, sauvegardées à la fin de chaque partie."}</p></>}</div>;
}
