"use client";

import { useState } from "react";
import { Check, RotateCcw, Send, Smartphone } from "lucide-react";
import { AVATARS, AVATAR_COLORS, parseNumber, qtype, QTYPES, SCALE_MAX, type Answer, type QuestionStats, type SnapshotQuestion } from "@/lib/game";

/** Zone de réponse des types qui ne se résument pas à toucher une proposition. */
export function AnswerPad({ question, disabled, onSubmit }: { question: SnapshotQuestion; disabled: boolean; onSubmit: (answer: Answer) => void }) {
  const type = qtype(question);
  const [picked, setPicked] = useState<number[]>([]);
  const [text, setText] = useState("");
  const options = question.options;

  if (type === "multi") return <div className="qt-pad">
    <p className="qt-hint">Cochez toutes les bonnes réponses.</p>
    <div className="qt-list">{options.map((option, i) => { const on = picked.includes(i); return <button key={i} type="button" className={`qt-choice ${on ? "on" : ""}`} aria-pressed={on} disabled={disabled} onClick={() => setPicked(p => on ? p.filter(v => v !== i) : [...p, i])}><span className="qt-box">{on && <Check size={14} />}</span><span>{option}</span></button>; })}</div>
    <button type="button" className="button button-primary qt-submit" disabled={disabled || !picked.length} onClick={() => onSubmit([...picked].sort((a, b) => a - b))}>Valider<Send size={16} /></button>
  </div>;

  if (type === "order") return <div className="qt-pad">
    <p className="qt-hint">Touchez les propositions dans le bon ordre.</p>
    <ol className="qt-sequence">{options.map((_, k) => <li key={k} className={picked[k] !== undefined ? "filled" : ""}>{picked[k] !== undefined
      ? <button type="button" disabled={disabled} onClick={() => setPicked(p => p.slice(0, k))} aria-label={`Retirer ${options[picked[k]]}`}><b>{k + 1}</b><span>{options[picked[k]]}</span></button>
      : <span><b>{k + 1}</b></span>}</li>)}</ol>
    <div className="qt-list">{options.map((option, i) => picked.includes(i) ? null : <button key={i} type="button" className="qt-choice" disabled={disabled} onClick={() => setPicked(p => [...p, i])}><span>{option}</span></button>)}</div>
    <div className="qt-actions">
      <button type="button" className="button button-ghost" disabled={disabled || !picked.length} onClick={() => setPicked([])}><RotateCcw size={15} />Recommencer</button>
      <button type="button" className="button button-primary qt-submit" disabled={disabled || picked.length !== options.length} onClick={() => onSubmit(picked)}>Valider<Send size={16} /></button>
    </div>
  </div>;

  if (type === "scale") return <div className="qt-pad">
    <div className="qt-scale">{Array.from({ length: SCALE_MAX }, (_, i) => <button key={i} type="button" disabled={disabled} onClick={() => onSubmit(i + 1)} aria-label={`Note ${i + 1} sur ${SCALE_MAX}`}>{i + 1}</button>)}</div>
    <div className="qt-scale-labels"><span>Pas du tout</span><span>Tout à fait</span></div>
  </div>;

  const numeric = type === "number";
  const parsed = numeric ? parseNumber(text) : text.trim() ? text.trim() : null;
  const send = () => { if (!disabled && parsed !== null) onSubmit(parsed); };
  return <div className="qt-pad">
    <div className="qt-text-row">
      <input className="text-input qt-input" value={text} disabled={disabled} maxLength={numeric ? 20 : 120} inputMode={numeric ? "decimal" : "text"} autoComplete="off" autoCapitalize="off" aria-label="Votre réponse" placeholder={numeric ? "Votre nombre" : type === "open" ? "Votre réponse…" : "Tapez votre réponse"} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); send(); } }} />
      <button type="button" className="button button-primary qt-submit" disabled={disabled || parsed === null} onClick={send}>Envoyer<Send size={16} /></button>
    </div>
  </div>;
}

/** Remplace la grille de propositions des types sans proposition (écran de l’hôte). */
export function StageNote({ question }: { question: SnapshotQuestion }) {
  const info = QTYPES.find(t => t.id === qtype(question));
  return <div className="qt-stage-note"><Smartphone size={26} /><strong>{info?.label}</strong><span>{qtype(question) === "scale" ? `Notez de 1 à ${SCALE_MAX} sur votre téléphone.` : "Répondez sur votre téléphone."}</span></div>;
}

/** Résultats agrégés d’une question révélée : échelle, réponses libres, nombres. */
export function ResultsPanel({ question, stats }: { question: SnapshotQuestion; stats?: QuestionStats }) {
  const type = qtype(question);
  if (!stats) return null;
  if (type === "scale" && stats.counts) {
    const max = Math.max(1, ...stats.counts);
    return <div className="qt-results"><div className="qt-bars">{stats.counts.map((n, i) => <div key={i}><span>{i + 1}</span><i><u style={{ width: `${(n / max) * 100}%` }} /></i><b>{n}</b></div>)}</div><p className="qt-avg">Moyenne : <strong>{stats.avg?.toFixed(1)}</strong> / {SCALE_MAX}</p></div>;
  }
  if ((type === "short" || type === "open" || type === "number") && stats.texts) {
    if (!stats.texts.length) return <div className="qt-results"><p className="qt-avg">Aucune réponse reçue.</p></div>;
    return <div className="qt-results"><ul className="qt-wall">{stats.texts.map((t, i) => <li key={i} className={t.ok === true ? "ok" : t.ok === false ? "ko" : ""}><span className="player-avatar" style={{ background: AVATAR_COLORS[t.avatar] }}>{AVATARS[t.avatar]}</span><span><small>{t.name}</small><strong>{t.text}</strong></span>{t.ok === true && <Check size={16} />}</li>)}</ul></div>;
  }
  return null;
}
