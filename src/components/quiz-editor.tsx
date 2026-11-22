"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Check, CheckCircle2, CircleHelp, FileAudio, ImagePlus, LoaderCircle, Plus, Save, Trash2, X } from "lucide-react";
import { type Question, type QuizPack, validateQuestions } from "@/lib/game";
import { api } from "@/lib/client";

function blankQuestion(): Question { return { id: crypto.randomUUID(), prompt: "", options: ["", "", "", ""], correct: 0, explanation: "", category: "Mon quiz" }; }
export default function QuizEditor({ initialPack, onSaved, onBack }: { initialPack?: QuizPack; onSaved: (pack: QuizPack) => void; onBack: () => void }) {
  const [title, setTitle] = useState(initialPack ? `${initialPack.title} — ma version` : "");
  const [description, setDescription] = useState(initialPack?.description || "");
  const [questions, setQuestions] = useState<Question[]>(initialPack ? initialPack.questions.map(q => ({ ...q, id: crypto.randomUUID(), options: [...q.options] })) : [blankQuestion()]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const question = questions[active];
  function update(patch: Partial<Question>) { setQuestions(all => all.map((q, i) => i === active ? { ...q, ...patch } : q)); }
  function add() { if (questions.length >= 30) return; setQuestions(all => [...all, blankQuestion()]); setActive(questions.length); }
  function remove() { if (questions.length < 2) return; setQuestions(all => all.filter((_, i) => i !== active)); setActive(i => Math.max(0, i - 1)); }
  async function importMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2.8 * 1024 * 1024) { setError("Votre média est un peu lourd : 2,8 Mo maximum."); return; }
    if (!/^(image\/(png|jpeg|webp|gif)|audio\/(mpeg|mp3|wav|ogg|x-wav))$/.test(file.type)) { setError("Choisissez une image PNG, JPG, WebP ou GIF, ou un son MP3, WAV ou OGG."); return; }
    const reader = new FileReader();
    const target = active;
    reader.onload = () => { setQuestions(all => all.map((q, i) => i === target ? { ...q, mediaUrl: String(reader.result), mediaType: file.type.startsWith("image") ? "image" : "audio" } : q)); setError(""); };
    reader.readAsDataURL(file);
    event.target.value = "";
  }
  async function save() {
    setError("");
    if (title.trim().length < 3) { setError("Donnez un titre d’au moins 3 caractères à votre chef-d’œuvre."); return; }
    const prepared = questions.map(q => ({ ...q, prompt: q.prompt.trim(), options: q.options.map(o => o.trim()), category: title.trim() }));
    if (!validateQuestions(prepared)) { setError("Un dernier petit effort : chaque question doit avoir un énoncé et quatre réponses remplies."); return; }
    setBusy(true);
    try { const saved = await api<QuizPack>("/api/quizzes", { method: "POST", body: JSON.stringify({ title: title.trim(), description, questions: prepared }) }); onSaved(saved); }
    catch (e) { setError(e instanceof Error ? e.message : "L’enregistrement a échoué."); }
    finally { setBusy(false); }
  }
  return <div className="editor-view"><div className="section-page-heading"><div><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Mes quiz</button><h1>Le prochain quiz culte ? Le vôtre.</h1><p>Vos références, vos private jokes, vos règles du jeu.</p></div><button className="button button-primary" disabled={busy} onClick={() => void save()}>{busy ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />} Enregistrer le quiz</button></div><div className="editor-layout"><aside className="editor-question-list"><span className="eyebrow">LES QUESTIONS <span>{questions.length}/30</span></span>{questions.map((q, i) => <button key={q.id} className={`editor-question-tab ${active === i ? "active" : ""}`} onClick={() => setActive(i)}><span>{String(i + 1).padStart(2, "0")}</span><span>{q.prompt || "Nouvelle question"}</span>{q.prompt && q.options.every(Boolean) ? <CheckCircle2 size={14} /> : <CircleHelp size={14} />}</button>)}<button className="add-question-button" onClick={add} disabled={questions.length >= 30}><Plus size={16} /> Ajouter une question</button><div className="editor-tip"><span>✦</span><strong>Le secret d’un bon quiz ?</strong><p>Une question facile pour la confiance. Une plus dure pour les egos.</p></div></aside><div className="editor-form"><div className="editor-pack-meta"><label className="field-label" htmlFor="quiz-title">LE NOM DE VOTRE QUIZ<input id="quiz-title" className="text-input title-input" maxLength={80} placeholder="Ex. Les dossiers du groupe" value={title} onChange={e => setTitle(e.target.value)} /></label><label className="field-label" htmlFor="quiz-description">LE PITCH EN UNE PHRASE<input id="quiz-description" className="text-input" maxLength={200} placeholder="Ex. Qui connaît vraiment les potes ?" value={description} onChange={e => setDescription(e.target.value)} /></label></div><div className="editor-question-header"><span className="pill pill-purple">QUESTION {String(active + 1).padStart(2, "0")}</span><span className="muted">20 secondes · Choix multiple</span><button className="icon-button danger-hover" disabled={questions.length < 2} aria-label="Supprimer cette question" onClick={remove}><Trash2 size={17} /></button></div><label className="field-label" htmlFor="question-prompt">À VOUS DE POSER LA QUESTION<textarea id="question-prompt" className="text-input question-textarea" placeholder="La question qui va mettre tout le monde d’accord… ou pas." maxLength={500} value={question.prompt} onChange={e => update({ prompt: e.target.value })} /></label><div className="field-label answer-edit-label">LES QUATRE POSSIBILITÉS <span><Check size={12} /> Cochez la bonne réponse</span></div><div className="editor-answers">{question.options.map((option, i) => <div className={`editor-answer ${question.correct === i ? "correct" : ""}`} key={i}><button aria-label={`Définir la réponse ${String.fromCharCode(65 + i)} comme correcte`} aria-pressed={question.correct === i} onClick={() => update({ correct: i })}>{question.correct === i ? <Check size={16} /> : String.fromCharCode(65 + i)}</button><input aria-label={`Réponse ${String.fromCharCode(65 + i)}`} maxLength={180} placeholder={`Réponse ${String.fromCharCode(65 + i)}`} value={option} onChange={e => update({ options: question.options.map((o, n) => n === i ? e.target.value : o) })} /></div>)}</div><label className="field-label" htmlFor="question-explanation">LA PETITE EXPLICATION <span>Facultatif, mais toujours apprécié.</span><textarea id="question-explanation" className="text-input" rows={2} maxLength={700} placeholder="Une anecdote, une précision, ou juste de quoi chambrer…" value={question.explanation} onChange={e => update({ explanation: e.target.value })} /></label><div className="editor-media"><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg" onChange={importMedia} className="sr-only" aria-label="Importer une image ou un extrait audio" />{question.mediaUrl ? <div className="media-preview">{question.mediaType === "image" ? <img src={question.mediaUrl} alt="Aperçu du média importé" /> : <audio src={question.mediaUrl} controls />}<button className="icon-button" onClick={() => update({ mediaUrl: undefined, mediaType: undefined })} aria-label="Supprimer le média"><X size={16} /></button></div> : <button className="media-upload" onClick={() => fileInput.current?.click()}><span><ImagePlus size={22} /><FileAudio size={21} /></span><strong>Un visuel ? Un extrait audio ?</strong><small>Cliquez pour importer · 2,8 Mo maximum</small></button>}</div>{error && <p className="form-error" role="alert">{error}</p>}<div className="editor-bottom"><p>Votre quiz sera sauvegardé dans la bibliothèque.</p><button className="button button-primary" onClick={() => void save()} disabled={busy}>{busy ? "Enregistrement…" : "C’est prêt, on enregistre"}<Check size={17} /></button></div></div></div></div>;
}
