"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Coins, Crown, LoaderCircle, LogOut, Pause, ShoppingBag, Sparkles, Trophy, Users, Volume2, VolumeX, X } from "lucide-react";
import { ALL_PACKS, MAX_PLAYERS, AVATARS, AVATAR_COLORS, formatScore, isScored, isSinglePick, QUESTION_TIME, solutionText, type Answer, type PlayerSession, type RoomSnapshot } from "@/lib/game";
import { api, playSound } from "@/lib/client";
import { BASE } from "@/lib/base";
import { BonusShop, Brand, Modal, Particles } from "@/components/ui";
import QuestionMedia from "@/components/question-media";
import { AnswerPad, ResultsPanel } from "@/components/question-types";
import { registerServiceWorker } from "@/components/app-install";

export default function JoinGame() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(0);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connected, setConnected] = useState(true);
  const [selected, setSelected] = useState<Answer | null>(null);
  const [left, setLeft] = useState(QUESTION_TIME);
  const [shop, setShop] = useState(false);
  const [sound, setSound] = useState(false);
  const lastReveal = useRef("");
  const profileId = useRef<string | undefined>(undefined);
  const me = room?.players.find(p => p.id === session?.playerId);
  const status = room?.status;
  const timed = (room?.timeLimit ?? QUESTION_TIME) > 0;

  useEffect(() => { registerServiceWorker(); }, []);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("code")?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "";
    setCode(query);
    try {
      const savedProfile = JSON.parse(localStorage.getItem("quizclub-player-profile") || "null");
      if (savedProfile) { setName(savedProfile.name || ""); setAvatar(savedProfile.avatar || 0); profileId.current = savedProfile.profileId; }
      if (query) {
        const saved = JSON.parse(localStorage.getItem(`quizclub-player-${query}`) || "null");
        if (saved?.playerToken) setSession(saved);
      }
    } catch { /* The game also works without persistent storage. */ }
  }, []);

  useEffect(() => {
    if (!session) return;
    let disposed = false, pending = false;
    const poll = async () => {
      if (pending) return; pending = true;
      try {
        const snapshot = await api<RoomSnapshot>(`/api/rooms?code=${session.code}`, { headers: { "x-player-token": session.playerToken } });
        if (disposed) return;
        if (snapshot.kicked) { try { localStorage.removeItem(`quizclub-player-${session.code}`); } catch {} setSession(null); setRoom(null); setError("Le maître du jeu vous a retiré du salon."); return; }
        if (!snapshot.players.some(p => p.id === session.playerId)) { setSession(null); setError("Votre place a été libérée. Vous pouvez rejoindre à nouveau le salon."); return; }
        setRoom(snapshot); setConnected(true);
      } catch (e) {
        if (disposed) return;
        if (e instanceof Error && e.message.includes("a été fermé")) { try { localStorage.removeItem(`quizclub-player-${session.code}`); } catch {} setSession(null); setRoom(null); setError(e.message); return; }
        setConnected(false);
      }
      finally { pending = false; }
    };
    void poll(); const timer = window.setInterval(poll, 1000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [session]);

  useEffect(() => { setSelected(null); setNotice(""); setError(""); setShop(false); }, [room?.question?.id]);
  useEffect(() => { if (status === "lobby" || status === "finished") { setSelected(null); setShop(false); } }, [status]);
  useEffect(() => {
    if (!room) return;
    const tick = () => setLeft(room.status === "playing" && room.startedAt ? Math.max(0, room.remainingSeconds - (Date.now() - new Date(room.startedAt).getTime()) / 1000) : room.remainingSeconds);
    tick(); const timer = window.setInterval(tick, 100); return () => window.clearInterval(timer);
  }, [room?.status, room?.startedAt, room?.remainingSeconds, room]);
  useEffect(() => {
    if (status !== "revealed" || !room?.question) return;
    const key = `${room.question.id}-${room.startedAt}`;
    if (lastReveal.current === key) return;
    lastReveal.current = key;
    if (sound && room.mine && room.mine.right !== null) playSound(room.mine.right ? "correct" : "wrong");
  }, [status, room, sound]);

  async function join() {
    setBusy(true); setError("");
    try {
      const result = await api<PlayerSession>(`/api/rooms/${code}`, { method: "POST", body: JSON.stringify({ action: "join", name, avatar, profileId: profileId.current }) });
      setSession(result);
      try {
        localStorage.setItem(`quizclub-player-${code}`, JSON.stringify(result));
        localStorage.setItem("quizclub-player-profile", JSON.stringify({ name: result.name, avatar: result.avatar, profileId: result.profileId }));
      } catch {}
      window.history.replaceState(null, "", `${BASE}/join/?code=${code}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Le salon n’a pas répondu."); }
    finally { setBusy(false); }
  }
  const command = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    if (!session) return false;
    setBusy(true); setError("");
    try {
      const snapshot = await api<RoomSnapshot>(`/api/rooms/${session.code}`, { method: "POST", headers: { "x-player-token": session.playerToken }, body: JSON.stringify({ action, ...data }) });
      setRoom(snapshot); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "La commande n’a pas abouti."); return false; }
    finally { setBusy(false); }
  }, [session]);
  async function answer(value: Answer) {
    if (selected !== null || busy || me?.hasAnswered || (timed && left <= 0)) return;
    setSelected(value);
    if (sound) playSound("click");
    if (await command("answer", { answer: value })) { setNotice("Réponse envoyée. Les jeux sont faits !"); try { navigator.vibrate?.(20); } catch {} }
    else setSelected(null);
  }
  function leave() {
    try { if (session) localStorage.removeItem(`quizclub-player-${session.code}`); } catch {}
    setSession(null); setRoom(null); setError(""); setNotice("");
  }

  if (!session) return <main className="join-page"><div className="join-background-orb" /><a className="join-brand" href={`${BASE}/`}><Brand /></a><section className="join-form-card"><span className="eyebrow"><span className="status-dot" /> LE QUIZ QUI RASSEMBLE</span><h1>La bande<br />vous attend<span>!</span></h1><p>Un pseudo, un avatar et une bonne dose<br />de mauvaise foi. Vous êtes prêt ?</p><label className="field-label" htmlFor="mobile-code">LE CODE DU SALON<input autoComplete="off" id="mobile-code" className="text-input code-input" placeholder="ABCD" maxLength={6} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></label><label className="field-label" htmlFor="mobile-name">VOTRE PSEUDO<input id="mobile-name" className="text-input" placeholder="Le futur champion, c’est…" value={name} maxLength={24} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && code.length >= 4 && name.trim().length >= 2) void join(); }} /></label><span className="field-label">CHOISISSEZ VOTRE ALTER EGO</span><div className="avatar-picker">{AVATARS.map((a, i) => <button key={a} className={avatar === i ? "selected" : ""} style={{ background: `${AVATAR_COLORS[i]}20` }} onClick={() => setAvatar(i)} aria-label={`Avatar ${a}`} aria-pressed={avatar === i}>{a}{avatar === i && <span><Check size={11} /></span>}</button>)}</div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary full-width join-submit" disabled={busy || code.length < 4 || name.trim().length < 2} onClick={() => void join()}>{busy ? <LoaderCircle size={19} className="spin" /> : <Users size={18} />}Rejoindre la bande<ArrowRight size={18} /></button><span className="join-privacy"><CheckCircle2 size={13} /> Pas de compte. Pas d’installation. Juste du jeu.</span></section><a className="join-host-link" href={`${BASE}/`}><ArrowLeft size={14} /> C’est vous le maître du jeu ? Par ici.</a></main>;

  const isRevealed = status === "revealed";
  const question = room?.question;
  const ranking = [...(room?.players || [])].sort((a, b) => b.score - a.score);
  return <main className="player-page"><header className="player-header"><a href={`${BASE}/`} aria-label="Quizclub accueil"><Brand small /></a><span className="player-room-label"><span className={`status-dot ${!connected ? "offline-dot" : ""}`} />{session.code}</span><button className="icon-button" onClick={() => { setSound(s => !s); if (!sound) playSound("click"); }} aria-label={sound ? "Couper le son" : "Activer le son"}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></header><div className="player-content">{!connected && <p className="inline-notice">Reconnexion au plateau… Vos points sont sauvegardés.</p>}{!room || !me ? <div className="empty-state"><LoaderCircle size={32} className="spin" /><p>On vous garde une place…</p></div> : status === "lobby" ? <><div className="player-welcome"><span className="player-welcome-avatar" style={{ background: `${AVATAR_COLORS[me.avatar]}20` }}>{AVATARS[me.avatar]}<span><Check size={16} /></span></span><span className="eyebrow lime">VOUS ÊTES DANS LA PLACE</span><h1>Bienvenue,<br />{" "}{me.name}<span>!</span></h1><p>Le maître du jeu prépare le show.<br />En attendant, choisissez votre camp.</p></div><section className="mobile-panel"><div className="panel-heading"><h2>La bande</h2><span className="pill pill-green">{room.players.length}/{MAX_PLAYERS} JOUEURS</span></div><div className="mobile-lobby-players">{room.players.map(p => <div key={p.id}><span className="player-avatar" style={{ background: AVATAR_COLORS[p.avatar] }}>{AVATARS[p.avatar]}</span><strong>{p.name}{p.id === me.id && <small> vous</small>}</strong><span className="mobile-ready"><Check size={13} /> Prêt</span></div>)}</div></section>{room.votingEnabled && <section className="mobile-panel vote-panel"><div className="panel-heading"><h2>On joue à quoi ?</h2><LayersIcon /></div><p className="panel-description">Votez pour votre thème préféré. L’hôte tranche.</p>{ALL_PACKS.map(pack => <button key={pack.id} className={`vote-option ${me.vote === pack.id ? "selected" : ""}`} disabled={busy} onClick={() => void command("vote", { packId: pack.id })}><img src={pack.image} alt="" /><span><strong>{pack.title}</strong><small>{pack.questions.length} questions</small></span><span className="vote-count">{room.players.filter(p => p.vote === pack.id).length}</span><i>{me.vote === pack.id && <Check size={13} />}</i></button>)}</section>}<div className="waiting-for-host"><span className="live-pulse" /><p>Le maître du jeu a les commandes.<br /><strong>La partie va bientôt commencer.</strong></p></div><button className="text-button player-leave" onClick={leave}><LogOut size={14} /> Quitter le salon</button></> : status === "finished" ? <section className="player-finished"><Particles seed={78} /><span className="mobile-trophy"><Trophy size={58} strokeWidth={1.5} /></span><span className="eyebrow lime">FIN DU SHOW</span><h1>{ranking[0]?.id === me.id ? "La couronne est à vous !" : "Du beau jeu. Et du beau monde."}</h1><div className="final-score">{formatScore(me.score)}<span>points · {ranking.findIndex(p => p.id === me.id) + 1}{ranking[0]?.id === me.id ? "er" : "e"} place</span></div><div className="mobile-final-ranking">{ranking.map((p, i) => <div key={p.id} className={p.id === me.id ? "is-me" : ""}><span className="rank">{i === 0 ? <Crown size={18} /> : `0${i + 1}`}</span><span className="player-avatar" style={{ background: AVATAR_COLORS[p.avatar] }}>{AVATARS[p.avatar]}</span><strong>{p.name}</strong><span>{formatScore(p.score)}</span></div>)}</div><p className="muted">Votre profil et vos points sont sauvegardés.<br />La revanche ? C’est l’hôte qui décide.</p><div className="waiting-for-host"><span className="live-pulse" /><p>En attente du prochain round…</p></div><button className="button button-ghost full-width" onClick={leave}><LogOut size={16} /> Quitter le salon</button></section> : question ? <section className={`player-question ${isRevealed && room.mine?.right ? "mobile-correct" : ""}`}>{isRevealed && room.mine?.right && <Particles seed={room.questionIndex} />}<div className="player-scorebar"><span className="mini-player"><span className="player-avatar" style={{ background: AVATAR_COLORS[me.avatar] }}>{AVATARS[me.avatar]}</span><span><strong>{me.name}</strong><small>{formatScore(me.score)} points</small></span></span><button className="coin-balance" disabled={!room.shopEnabled} onClick={() => setShop(true)}><Coins size={17} />{me.coins}<ShoppingBag size={15} /></button></div><div className="game-progress">{Array.from({ length: room.totalQuestions }, (_, i) => <span key={i} className={i < room.questionIndex ? "done" : i === room.questionIndex ? "current" : ""} />)}</div><div className="question-meta"><span>QUESTION <strong>{String(room.questionIndex + 1).padStart(2, "0")}</strong> / {String(room.totalQuestions).padStart(2, "0")}</span><span className="mobile-time"><Clock3 size={16} />{timed ? `${Math.ceil(left)} s` : "∞"}</span></div><span className="category-pill">{question.category}</span><h1>{question.prompt}</h1><QuestionMedia question={question} mode="viewer" autoplay={false} phoneMedia={room.phoneMedia !== false} runKey={`${question.id}-${room.questionIndex}`} />{isSinglePick(question) ? <div className="mobile-answer-grid">{question.options.map((option, i) => <button className={`mobile-answer answer-color-${i % 4} ${selected === i ? "selected" : ""} ${isRevealed && question.correct === i ? "is-correct" : ""} ${isRevealed && selected === i && question.correct !== undefined && selected !== question.correct ? "is-wrong" : ""} ${room.eliminated.includes(i) && !isRevealed ? "is-eliminated" : ""}`} key={`${question.id}-${i}`} disabled={busy || me.hasAnswered || selected !== null || status !== "playing" || (timed && left <= 0) || room.eliminated.includes(i)} onClick={() => void answer(i)}><span>{String.fromCharCode(65 + i)}</span><strong>{option}</strong>{isRevealed && room.stats?.counts && <em className="qt-count">{room.stats.counts[i]}</em>}{isRevealed && question.correct === i && <Check size={20} />}</button>)}</div> : !isRevealed && <AnswerPad key={question.id} question={question} disabled={busy || me.hasAnswered || selected !== null || status !== "playing" || (timed && left <= 0)} onSubmit={value => void answer(value)} />}{isRevealed ? <div className={`mobile-reveal ${room.mine?.right ? "right" : ""}`}><strong>{!isScored(question) ? "Merci pour votre réponse !" : room.mine?.right ? "Dans le mille !" : solutionText(question)}{room.mine && room.mine.points > 0 && <span> +{formatScore(room.mine.points)} pts</span>}</strong><ResultsPanel question={question} stats={room.stats} />{question.explanation && <p>{question.explanation}</p>}<span>La suite arrive. Le maître du jeu a la main.</span></div> : me.hasAnswered || selected !== null ? <div className="mobile-answer-sent"><CheckCircle2 size={25} /><strong>Les jeux sont faits !</strong><p>Réponse envoyée. Croisez les doigts.</p></div> : (timed && left <= 0) ? <div className="mobile-answer-sent"><Clock3 size={24} /><strong>Le temps file !</strong><p>La bonne réponse va bientôt être révélée.</p></div> : <div className="mobile-answer-tip"><Sparkles size={16} />{isScored(question) ? "La vitesse rapporte. La bonne réponse aussi." : "Pas de points ici : répondez franchement."}</div>}{status === "paused" && <div className="pause-overlay"><div className="pause-icon"><Pause size={35} /></div><span className="eyebrow">INTERLUDE</span><h2>On reprend son souffle.</h2><p>Le maître du jeu a mis la partie en pause.<br />Vos points vous attendent.</p></div>}</section> : null}{error && <p className="form-error" role="alert">{error}</p>}{notice && !isRevealed && <p className="sr-only" role="status">{notice}</p>}</div>{shop && me && <Modal title="Les petits avantages" onClose={() => setShop(false)}><BonusShop coins={me.coins} active={[...(me.doubleNext ? ["double"] : []), ...(me.shield ? ["shield"] : []), ...(me.hint ? ["hint"] : [])]} onBuy={async id => { if (await command("buy", { itemId: id })) { setNotice("Bonus activé. À vous de jouer !"); if (sound) playSound("buy"); } }} disabled={busy} message={error || notice} /><button className="button button-primary full-width" onClick={() => setShop(false)}>Retour au jeu<ArrowRight size={17} /></button><p className="shop-footnote">Le chronomètre continue pendant vos achats.</p></Modal>}</main>;
}
function LayersIcon() { return <Sparkles size={17} />; }
