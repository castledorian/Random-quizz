"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, CircleHelp, ImageIcon, LoaderCircle, Music, Play, Plus, Save, Trash2, Video, X } from "lucide-react";
import { formatTime, parseTime, type Question, type QuestionMedia, type QuizPack, validateQuestions, validMedia } from "@/lib/game";
import QuestionMediaView from "@/components/question-media";
import { api } from "@/lib/client";

function TimeField({ label, value, onCommit }: { label: string; value?: number; onCommit: (value: number | undefined) => void }) {
  const [draft, setDraft] = useState(formatTime(value));
  useEffect(() => { setDraft(formatTime(value)); }, [value]);
  const commit = () => { const parsed = parseTime(draft); onCommit(parsed ?? undefined); setDraft(formatTime(parsed ?? undefined)); };
  return <label className="field-label">{label}<input className="text-input" inputMode="numeric" autoComplete="off" placeholder="0:00" value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } }} /></label>;
}
function blankQuestion(): Question { return { id: crypto.randomUUID(), prompt: "", options: ["", "", "", ""], correct: 0, explanation: "", category: "Mon quiz" }; }
export default function QuizEditor({ initialPack, onSaved, onBack }: { initialPack?: QuizPack; onSaved: (pack: QuizPack) => void; onBack: () => void }) {
  const editing = initialPack?.custom ? initialPack : undefined;
  const [title, setTitle] = useState(initialPack ? (editing ? initialPack.title : `${initialPack.title} — ma version`) : "");
  const [description, setDescription] = useState(initialPack?.description || "");
  const [questions, setQuestions] = useState<Question[]>(initialPack ? initialPack.questions.map(q => ({ ...q, id: editing ? q.id : crypto.randomUUID(), options: [...q.options] })) : [blankQuestion()]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(0);
  const question = questions[active];
  function update(patch: Partial<Question>) { setQuestions(all => all.map((q, i) => i === active ? { ...q, ...patch } : q)); }
  function add() { if (questions.length >= 30) return; setQuestions(all => [...all, blankQuestion()]); setActive(questions.length); }
  function remove() { if (questions.length < 2) return; setQuestions(all => all.filter((_, i) => i !== active)); setActive(i => Math.max(0, i - 1)); }
  const media = question.media;
  useEffect(() => { setPreview(0); }, [active]);
  function setKind(kind: QuestionMedia["kind"] | null) {
    if (!kind) { update({ media: undefined, mediaUrl: undefined, mediaType: undefined }); return; }
    update({ media: { kind, url: media?.url ?? "", ...(kind !== "photo" ? { start: media?.start, end: media?.end } : {}) }, mediaUrl: undefined, mediaType: undefined });
    setPreview(0);
  }
  function setMedia(patch: Partial<QuestionMedia>) { if (media) update({ media: { ...media, ...patch } }); setPreview(0); }
  function setUrl(url: string) {
    let start = media?.start;
    if (media && media.kind !== "photo" && start === undefined) {
      try { const u = new URL(url); const t = u.searchParams.get("t") ?? u.searchParams.get("start"); const parsed = t ? parseTime(t) : null; if (parsed !== null) start = parsed; } catch { /* Lien en cours de saisie. */ }
    }
    setMedia({ url, ...(start !== undefined ? { start } : {}) });
  }
  async function save() {
    setError("");
    if (title.trim().length < 3) { setError("Donnez un titre d’au moins 3 caractères à votre chef-d’œuvre."); return; }
    const prepared = questions.map(q => ({ ...q, prompt: q.prompt.trim(), options: q.options.map(o => o.trim()), category: title.trim(), media: q.media && q.media.url.trim() ? { ...q.media, url: q.media.url.trim() } : undefined }));
    const badMedia = prepared.findIndex(q => q.media && !validMedia(q.media));
    if (badMedia >= 0) { setActive(badMedia); setError(`Question ${badMedia + 1} : le lien du média n’est pas valide. Utilisez un lien YouTube pour la vidéo et la musique (le début doit précéder la fin).`); return; }
    if (!validateQuestions(prepared)) { setError("Un dernier petit effort : chaque question doit avoir un énoncé et quatre réponses remplies."); return; }
    setBusy(true);
    try { const saved = await api<QuizPack>("/api/quizzes", { method: "POST", body: JSON.stringify({ id: editing?.id, title: title.trim(), description, questions: prepared }) }); onSaved(saved); }
    catch (e) { setError(e instanceof Error ? e.message : "L’enregistrement a échoué."); }
    finally { setBusy(false); }
  }
  return <div className="editor-view"><div className="section-page-heading"><div><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Mes quiz</button><h1>Le prochain quiz culte ? Le vôtre.</h1><p>Vos références, vos private jokes, vos règles du jeu.</p></div><button className="button button-primary" disabled={busy} onClick={() => void save()}>{busy ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />} Enregistrer le quiz</button></div><div className="editor-layout"><aside className="editor-question-list"><span className="eyebrow">LES QUESTIONS <span>{questions.length}/30</span></span>{questions.map((q, i) => <button key={q.id} className={`editor-question-tab ${active === i ? "active" : ""}`} onClick={() => setActive(i)}><span>{String(i + 1).padStart(2, "0")}</span><span>{q.prompt || "Nouvelle question"}</span>{q.prompt && q.options.every(Boolean) ? <CheckCircle2 size={14} /> : <CircleHelp size={14} />}</button>)}<button className="add-question-button" onClick={add} disabled={questions.length >= 30}><Plus size={16} /> Ajouter une question</button><div className="editor-tip"><span>✦</span><strong>Le secret d’un bon quiz ?</strong><p>Une question facile pour la confiance. Une plus dure pour les egos.</p></div></aside><div className="editor-form"><div className="editor-pack-meta"><label className="field-label" htmlFor="quiz-title">LE NOM DE VOTRE QUIZ<input id="quiz-title" className="text-input title-input" maxLength={80} placeholder="Ex. Les dossiers du groupe" value={title} onChange={e => setTitle(e.target.value)} /></label><label className="field-label" htmlFor="quiz-description">LE PITCH EN UNE PHRASE<input id="quiz-description" className="text-input" maxLength={200} placeholder="Ex. Qui connaît vraiment les potes ?" value={description} onChange={e => setDescription(e.target.value)} /></label></div><div className="editor-question-header"><span className="pill pill-purple">QUESTION {String(active + 1).padStart(2, "0")}</span><span className="muted">20 secondes · Choix multiple</span><button className="icon-button danger-hover" disabled={questions.length < 2} aria-label="Supprimer cette question" onClick={remove}><Trash2 size={17} /></button></div><label className="field-label" htmlFor="question-prompt">À VOUS DE POSER LA QUESTION<textarea id="question-prompt" className="text-input question-textarea" placeholder="La question qui va mettre tout le monde d’accord… ou pas." maxLength={500} value={question.prompt} onChange={e => update({ prompt: e.target.value })} /></label><div className="field-label answer-edit-label">LES QUATRE POSSIBILITÉS <span><Check size={12} /> Cochez la bonne réponse</span></div><div className="editor-answers">{question.options.map((option, i) => <div className={`editor-answer ${question.correct === i ? "correct" : ""}`} key={i}><button aria-label={`Définir la réponse ${String.fromCharCode(65 + i)} comme correcte`} aria-pressed={question.correct === i} onClick={() => update({ correct: i })}>{question.correct === i ? <Check size={16} /> : String.fromCharCode(65 + i)}</button><input aria-label={`Réponse ${String.fromCharCode(65 + i)}`} maxLength={180} placeholder={`Réponse ${String.fromCharCode(65 + i)}`} value={option} onChange={e => update({ options: question.options.map((o, n) => n === i ? e.target.value : o) })} /></div>)}</div><label className="field-label" htmlFor="question-explanation">LA PETITE EXPLICATION <span>Facultatif, mais toujours apprécié.</span><textarea id="question-explanation" className="text-input" rows={2} maxLength={700} placeholder="Une anecdote, une précision, ou juste de quoi chambrer…" value={question.explanation} onChange={e => update({ explanation: e.target.value })} /></label><div className="editor-media"><span className="field-label">UN MÉDIA POUR CETTE QUESTION <span>Facultatif</span></span><div className="media-kind-tabs" role="tablist">{([[null, "Aucun", X], ["photo", "Photo / GIF", ImageIcon], ["video", "Vidéo", Video], ["music", "Musique", Music]] as const).map(([kind, label, Icon]) => <button key={label} type="button" role="tab" aria-selected={(media?.kind ?? null) === kind} className={(media?.kind ?? null) === kind ? "active" : ""} onClick={() => setKind(kind)}><Icon size={16} />{label}</button>)}</div>{question.mediaUrl && !media && <div className="media-preview">{question.mediaType === "image" ? <img src={question.mediaUrl} alt="Aperçu du média importé" /> : <audio src={question.mediaUrl} controls />}<button className="icon-button" onClick={() => update({ mediaUrl: undefined, mediaType: undefined })} aria-label="Supprimer le média"><X size={16} /></button></div>}{media && <><label className="field-label" htmlFor="media-url">{media.kind === "photo" ? "LIEN DIRECT DE L’IMAGE OU DU GIF" : "LIEN YOUTUBE"}<input id="media-url" className="text-input" inputMode="url" autoComplete="off" placeholder={media.kind === "photo" ? "https://…/image.jpg" : "https://www.youtube.com/watch?v=…"} value={media.url} onChange={e => setUrl(e.target.value)} /></label>{media.kind === "photo" ? <small className="media-help">Astuce : clic droit sur l’image → « Copier l’adresse de l’image ». Le lien doit se terminer par .jpg, .png, .gif ou .webp.</small> : <><div className="media-times"><TimeField label="DÉBUT (min:sec)" value={media.start} onCommit={v => setMedia({ start: v })} /><TimeField label="FIN (min:sec)" value={media.end} onCommit={v => setMedia({ end: v })} /></div><small className="media-help">{media.kind === "music" ? "Seul le son est lu, sans l’image, sur l’écran de l’hôte." : "La vidéo est lue sur l’écran de l’hôte."} Laissez la fin vide pour aller jusqu’au bout.</small></>}{media.url.trim() && <div className="media-editor-preview"><QuestionMediaView question={{ media }} mode="stage" autoplay={preview > 0} runKey={`${question.id}-${preview}`} />{media.kind !== "photo" && preview === 0 && <button type="button" className="button button-soft" onClick={() => setPreview(1)}><Play size={15} /> Tester l’extrait</button>}</div>}</>}</div>{error && <p className="form-error" role="alert">{error}</p>}<div className="editor-bottom"><p>{editing ? "Vos modifications remplaceront la version enregistrée." : "Votre quiz sera sauvegardé dans la bibliothèque, sur cet appareil."}</p><button className="button button-primary" onClick={() => void save()} disabled={busy}>{busy ? "Enregistrement…" : "C’est prêt, on enregistre"}<Check size={17} /></button></div></div></div></div>;
}
