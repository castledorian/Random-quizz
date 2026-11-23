"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Coins, Flame, Pause, Play, RotateCcw, ShoppingBag, Sparkles, Trophy, X, Zap } from "lucide-react";
import { formatScore, QUESTION_TIME, SHOP_ITEMS, type HighScore, type QuizPack } from "@/lib/game";
import { api, playSound, readHighScores, saveHighScore } from "@/lib/client";
import { BonusShop, Modal, Particles } from "@/components/ui";
import QuestionMedia from "@/components/question-media";

export default function SoloGame({ pack, name, sound, onExit, onFinish, startingBonus, shopEnabled = true }: { pack: QuizPack; name: string; sound: boolean; onExit: () => void; onFinish: (score: HighScore) => void; startingBonus?: string; shopEnabled?: boolean }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"playing" | "feedback" | "paused" | "finished">("playing");
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(150 - (SHOP_ITEMS.find(item => item.id === startingBonus)?.price || 0));
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [awarded, setAwarded] = useState(0);
  const [double, setDouble] = useState(startingBonus === "double");
  const [hint, setHint] = useState(startingBonus === "hint");
  const [shield, setShield] = useState(startingBonus === "shield");
  const [shopOpen, setShopOpen] = useState(false);
  const [shopMessage, setShopMessage] = useState("");
  const [burst, setBurst] = useState(0);
  const [board, setBoard] = useState<HighScore[]>([]);
  const start = useRef(Date.now());
  const pausedRemaining = useRef(QUESTION_TIME);
  const locked = useRef(false);
  const saved = useRef(false);
  const question = pack.questions[index];
  const isRight = selected === question.correct;

  const answer = useCallback((choice: number) => {
    if (phase !== "playing" || locked.current) return;
    if (hint && question.options.map((_, i) => i).filter(i => i !== question.correct).slice(0, 2).includes(choice)) return;
    locked.current = true;
    const remaining = Math.max(0, QUESTION_TIME - (Date.now() - start.current) / 1000);
    const right = choice === question.correct;
    const points = right ? Math.round((500 + remaining / QUESTION_TIME * 500 + Math.min(streak, 3) * 100) * (double ? 2 : 1)) : shield ? 150 : 0;
    setSelected(choice); setAwarded(points); setScore(s => s + points); setCoins(c => c + (right ? 80 : 10));
    setStreak(s => right ? s + 1 : 0); setCorrectCount(c => c + (right ? 1 : 0)); setDouble(false);
    if (!right) setShield(false);
    setPhase("feedback");
    if (right) setBurst(b => b + 1);
    if (sound) playSound(right ? "correct" : "wrong");
    try { navigator.vibrate?.(right ? [15, 30, 15] : 60); } catch { /* Optional haptics. */ }
  }, [phase, question, streak, double, shield, sound, hint]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, QUESTION_TIME - (Date.now() - start.current) / 1000);
      setTimeLeft(left);
      if (left <= 0) answer(-1);
    }, 80);
    return () => window.clearInterval(timer);
  }, [phase, answer]);

  const next = useCallback(() => {
    if (index === pack.questions.length - 1) { setPhase("finished"); if (sound) playSound("finish"); return; }
    setIndex(i => i + 1); setSelected(null); setAwarded(0); setHint(false); setTimeLeft(QUESTION_TIME);
    start.current = Date.now(); locked.current = false; setPhase("playing");
  }, [index, pack.questions.length, sound]);

  const pause = useCallback(() => {
    if (phase === "playing") { pausedRemaining.current = Math.max(0, QUESTION_TIME - (Date.now() - start.current) / 1000); setPhase("paused"); }
    else if (phase === "paused") { start.current = Date.now() - (QUESTION_TIME - pausedRemaining.current) * 1000; setPhase("playing"); }
  }, [phase]);

  const restart = useCallback(() => {
    setIndex(0); setPhase("playing"); setSelected(null); setScore(0); setCoins(150); setStreak(0); setCorrectCount(0); setTimeLeft(QUESTION_TIME);
    setAwarded(0); setDouble(false); setHint(false); setShield(false); setBurst(0); saved.current = false; locked.current = false; start.current = Date.now();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches("input, textarea, select") || shopOpen || event.repeat) return;
      const choice = ["1", "2", "3", "4"].indexOf(event.key);
      const letter = ["a", "b", "c", "d"].indexOf(event.key.toLowerCase());
      if (phase === "playing" && (choice >= 0 || letter >= 0)) { event.preventDefault(); answer(choice >= 0 ? choice : letter); }
      if (event.key.toLowerCase() === "p" || event.key === "Escape") { event.preventDefault(); pause(); }
      if (event.code === "Space" || event.key === "Enter") {
        if (phase === "feedback") { event.preventDefault(); next(); }
        else if (phase === "finished") { event.preventDefault(); restart(); }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, answer, pause, next, restart, shopOpen]);

  useEffect(() => {
    if (phase !== "finished" || saved.current) return;
    saved.current = true;
    const row: HighScore = { id: crypto.randomUUID(), name, score, correct: correctCount, total: pack.questions.length, packName: pack.title, date: new Date().toISOString() };
    setBoard(saveHighScore(row));
    void api("/api/scores", { method: "POST", body: JSON.stringify(row) }).catch(() => {});
    onFinish(row);
  }, [phase, score, correctCount, name, pack, onFinish]);

  function buy(id: string) {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || coins < item.price) return;
    if (id === "hint" && phase !== "playing") { setShopMessage("Gardez le 50 / 50 pour la prochaine question !"); return; }
    setCoins(c => c - item.price);
    if (id === "double") setDouble(true); else if (id === "hint") setHint(true); else setShield(true);
    setShopMessage(`${item.name} activé. À vous de faire la différence !`);
    if (sound) playSound("buy");
  }

  if (phase === "finished") return <section className="game-stage finished-stage"><Particles seed={999} /><div className="finished-glow" /><div className="trophy-orbit"><Sparkles className="orbit-spark one" size={22} /><Trophy size={56} strokeWidth={1.5} /><Sparkles className="orbit-spark two" size={17} /></div><span className="eyebrow lime">C’ÉTAIT DU BEAU JEU</span><h2>{correctCount >= pack.questions.length / 2 ? `Bien joué, ${name} !` : "L’échauffement est terminé !"}</h2><p className="muted">La revanche est une très bonne idée.</p><div className="final-score">{formatScore(score)}<span>points</span></div><div className="end-stats"><span><Check size={17} /><strong>{correctCount}/{pack.questions.length}</strong> bonnes réponses</span><span><Coins size={17} /><strong>{coins}</strong> pièces récoltées</span></div><div className="finished-actions"><button className="button button-primary" onClick={restart}><RotateCcw size={17} /> On remet ça</button><button className="button button-ghost" onClick={onExit}>Retour au plateau <ArrowRight size={17} /></button></div><div className="mini-leaderboard"><h3><Trophy size={15} /> LE TOP DE CE NAVIGATEUR</h3>{(board.length ? board : readHighScores()).slice(0, 3).map((s, i) => <div className="mini-score-row" key={s.id}><span className="rank">0{i + 1}</span><span>{s.name}<small>{s.packName}</small></span><strong>{formatScore(s.score)} <small>pts</small></strong></div>)}</div></section>;

  return <section className={`game-stage ${phase === "feedback" ? isRight ? "answer-success" : "answer-shake" : ""}`}>
    {burst > 0 && phase === "feedback" && isRight && <Particles seed={burst} />}
    <div className="game-topline"><button className="icon-button" onClick={onExit} aria-label="Quitter la partie"><ArrowLeft size={18} /></button><span className="eyebrow">SOLO <span className="tiny-dot" /> {pack.title}</span><div className="game-top-actions"><button className="coin-balance" disabled={!shopEnabled} title={shopEnabled ? "Ouvrir la boutique" : "La boutique a été désactivée dans les règles du salon"} onClick={() => { setShopMessage(""); setShopOpen(true); }} aria-label="Ouvrir la boutique"><Coins size={16} />{coins}<ShoppingBag size={14} /></button><button className="icon-button" onClick={pause} disabled={phase === "feedback"} aria-label="Mettre en pause"><Pause size={18} /></button></div></div>
    <div className="game-progress">{pack.questions.map((_, i) => <span key={i} className={i < index ? "done" : i === index ? "current" : ""} />)}</div>
    <div className="question-meta"><span>QUESTION <strong>{String(index + 1).padStart(2, "0")}</strong> / {String(pack.questions.length).padStart(2, "0")}</span><span className="live-score"><Zap size={16} />{formatScore(score)} <small>pts</small></span></div>
    <div className="question-category"><span className="category-pill">{question.category}</span>{streak >= 2 && <span className="streak"><Flame size={14} /> {streak} à la suite !</span>}<div className={`timer ${timeLeft < 6 ? "timer-urgent" : ""}`} aria-label={`${Math.ceil(timeLeft)} secondes restantes`}><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" className="timer-track" /><circle cx="30" cy="30" r="26" className="timer-value" style={{ strokeDashoffset: 163.36 * (1 - timeLeft / QUESTION_TIME) }} /></svg><strong>{Math.ceil(timeLeft)}</strong></div></div>
    <h2 className="question-title" key={question.id}>{question.prompt}</h2>
    <QuestionMedia question={question} mode="stage" autoplay={phase === "playing"} runKey={`${question.id}-${index}`} />
    <div className="answer-grid">{question.options.map((option, i) => {
      const eliminated = hint && i !== question.correct && question.options.map((_, n) => n).filter(n => n !== question.correct).slice(0, 2).includes(i);
      return <button key={`${index}-${i}`} className={`answer-option ${phase === "feedback" && i === question.correct ? "is-correct" : ""} ${phase === "feedback" && selected === i && !isRight ? "is-wrong" : ""} ${eliminated && phase !== "feedback" ? "is-eliminated" : ""}`} disabled={phase !== "playing" || eliminated} onClick={() => answer(i)}><span className="answer-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span><span className="answer-indicator">{phase === "feedback" && i === question.correct ? <Check size={20} /> : phase === "feedback" && selected === i ? <X size={20} /> : <kbd>{i + 1}</kbd>}</span></button>;
    })}</div>
    <div className="game-bottom">{phase === "feedback" ? <><div className={`answer-feedback ${isRight ? "correct-feedback" : "wrong-feedback"}`}><strong>{isRight ? ["Bien vu !", "Dans le mille !", "C’est la bonne !"][index % 3] : selected === -1 ? "Le temps file !" : shield || awarded ? "Bonus de consolation !" : "Presque… ou pas !"} {awarded > 0 && <span>+{formatScore(awarded)} pts</span>}</strong><p>{question.explanation}</p></div><button className="button button-primary" onClick={next}>{index === pack.questions.length - 1 ? "Voir les résultats" : "Question suivante"}<ArrowRight size={17} /></button></> : <><p className="game-tip">{double ? <><Zap size={15} /> Double mise activée : faites-vous confiance.</> : shield ? <>Votre filet de sécurité est prêt. Osez !</> : <><Sparkles size={15} /> Plus vous répondez vite, plus vous marquez.</>}</p><span className="keyboard-hint"><kbd>1</kbd>–<kbd>4</kbd> pour répondre <span>·</span> <kbd>P</kbd> pause</span></>}</div>
    {phase === "paused" && <div className="pause-overlay"><div className="pause-icon"><Pause size={35} /></div><span className="eyebrow">ON SOUFFLE UN PEU</span><h2>Pause café ?</h2><p>Vos points sont au chaud. Revenez quand vous voulez.</p><button className="button button-primary" onClick={pause}><Play size={17} fill="currentColor" /> Reprendre la partie</button><button className="text-button" onClick={restart}><RotateCcw size={14} /> Recommencer</button></div>}
    {shopOpen && <Modal title="La boutique des petits avantages" onClose={() => setShopOpen(false)}><BonusShop coins={coins} active={[...(double ? ["double"] : []), ...(hint ? ["hint"] : []), ...(shield ? ["shield"] : [])]} onBuy={buy} message={shopMessage} /><button className="button button-primary full-width" onClick={() => setShopOpen(false)}>Retour au jeu <ArrowRight size={17} /></button><p className="shop-footnote">Attention, le chronomètre continue pendant vos emplettes !</p></Modal>}
  </section>;
}
