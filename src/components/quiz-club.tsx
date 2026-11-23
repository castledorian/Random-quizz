"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { ArrowRight, ArrowUpRight, AudioLines, BookOpen, Check, ChevronRight, ChevronsUpDown, CircleHelp, Clock3, Coins, Copy, Crown, ExternalLink, Gamepad2, Layers3, LayoutDashboard, LoaderCircle, Maximize, Menu, Minus, Plus, Radio, Rocket, Settings2, ShoppingBag, Smartphone, Trophy, UserPlus, Users, Volume2, VolumeX, X, Zap } from "lucide-react";
import { ALL_PACKS, MAX_PLAYERS, AVATARS, AVATAR_COLORS, formatScore, MIX_PACK, PACKS, SHOP_ITEMS, type HighScore, type QuizPack, type RoomSnapshot } from "@/lib/game";
import { api, playSound, readHighScores } from "@/lib/client";
import { asset, BASE } from "@/lib/base";
import { exportBackup } from "@/lib/local-store";
import { useHostRoom } from "@/lib/use-host-room";
import { Brand, Modal, ShopItemIcon, Toggle } from "@/components/ui";
import SoloGame from "@/components/solo-game";
import CoverImg from "@/components/cover-img";
import AppInstallButton from "@/components/app-install";
import HostGame from "@/components/host-game";
import Library from "@/components/library";
import Leaderboard from "@/components/leaderboard";
import QuizEditor from "@/components/quiz-editor";

type View = "plateau" | "library" | "shop" | "leaderboard" | "editor" | "game";
type Dialog = "start" | "invite" | "rules" | "profile" | "join" | null;
const VIEW_LABELS: Record<View, string> = { plateau: "Le plateau", library: "Mes quiz", shop: "La boutique", leaderboard: "Le classement", editor: "L’éditeur", game: "La partie" };

export default function QuizClub() {
  const [view, setView] = useState<View>("plateau");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [sound, setSound] = useState(false);
  const [name, setName] = useState("Alex");
  const [avatar, setAvatar] = useState(0);
  const [draftName, setDraftName] = useState("Alex");
  const [draftAvatar, setDraftAvatar] = useState(0);
  const [joinCode, setJoinCode] = useState("");
  const [origin, setOrigin] = useState("");
  const [customPacks, setCustomPacks] = useState<QuizPack[]>([]);
  const [scores, setScores] = useState<HighScore[]>([]);
  const [selectedPack, setSelectedPack] = useState<QuizPack>(MIX_PACK);
  const [editorPack, setEditorPack] = useState<QuizPack | undefined>();
  const [mode, setMode] = useState<"solo" | "host">("solo");
  const [solo, setSolo] = useState(false);
  const [startingBonus, setStartingBonus] = useState<string | undefined>();
  const [runKey, setRunKey] = useState(0);
  const [startError, setStartError] = useState("");
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("100");
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const { session, room, connection, busy, error, clearError, create, command } = useHostRoom();
  const packs = [...customPacks, ...ALL_PACKS];
  const inviteUrl = session ? `${origin}${BASE}/join/?code=${session.code}` : "";
  const notify = useCallback((text: string, isError = false) => setToast({ text, error: isError }), []);

  useEffect(() => {
    setOrigin(window.location.origin);
    setScores(readHighScores());
    try {
      const profile = JSON.parse(localStorage.getItem("quizclub-host-profile") || "null");
      if (profile?.name) { setName(profile.name); setDraftName(profile.name); setAvatar(profile.avatar || 0); setDraftAvatar(profile.avatar || 0); }
      setSound(localStorage.getItem("quizclub-sound") === "true");
    } catch { /* Defaults are ready to play. */ }
    void api<QuizPack[]>("/api/quizzes").then(setCustomPacks).catch(() => {});
    try { void navigator.storage?.persist?.(); } catch { /* Facultatif : protège les quiz contre le nettoyage automatique. */ }
  }, []);
  useEffect(() => { if (error) { notify(error, true); clearError(); } }, [error, clearError, notify]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 4200); return () => window.clearTimeout(t); }, [toast]);

  function navigate(next: View) { setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function changeSound() { setSound(s => { try { localStorage.setItem("quizclub-sound", String(!s)); } catch {} if (!s) playSound("click"); return !s; }); }
  function openStart(pack: QuizPack = MIX_PACK) {
    let chosen = pack;
    if (pack.id === "mix" && room?.votingEnabled) {
      const votes = room.players.reduce<Record<string, number>>((all, p) => { if (p.vote) all[p.vote] = (all[p.vote] || 0) + 1; return all; }, {});
      const winner = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
      chosen = ALL_PACKS.find(p => p.id === winner) || pack;
    }
    setSelectedPack(chosen); setMode(room?.players.length ? "host" : "solo"); setStartError(""); setDialog("start");
  }
  function startSolo(pack: QuizPack = MIX_PACK, bonus?: string) {
    setSelectedPack(pack); setStartingBonus(bonus); setSolo(true); setRunKey(k => k + 1); setDialog(null); navigate("game");
    if (sound) playSound("click");
  }
  async function startGame() {
    if (mode === "solo") { startSolo(selectedPack); return; }
    if (!room?.players.length) { setStartError("Le salon attend ses joueurs ! Invitez vos amis, ou essayez le mode solo."); return; }
    if (await command("start", { packId: selectedPack.id })) { setSolo(false); setDialog(null); navigate("game"); }
  }
  const hostCommand = useCallback(async (action: string, data?: Record<string, unknown>) => {
    const ok = await command(action, data);
    if (ok && action === "reset") setView("plateau");
  }, [command]);
  const finishSolo = useCallback(() => setScores(readHighScores()), []);
  async function copyInvite(codeOnly = false) {
    if (!session) { notify("Le salon se prépare…", true); return; }
    try { await navigator.clipboard.writeText(codeOnly ? session.code : inviteUrl); notify(codeOnly ? "Code copié. À vous de rameuter la bande !" : "Lien d’invitation copié. Faites tourner !"); }
    catch { setDialog("invite"); }
  }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { notify("Le plein écran n’est pas disponible sur ce navigateur.", true); }
  }
  function downloadBackup() {
    const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `random-quizz-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    notify("Sauvegarde téléchargée. Gardez-la précieusement !");
  }
  async function importBackupFile(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const packs = await api<QuizPack[]>("/api/quizzes", { method: "POST", body: JSON.stringify({ ...data, action: "import" }) });
      setCustomPacks(packs); notify(`Sauvegarde importée : ${packs.length} quiz dans votre bibliothèque.`);
    } catch (e) { notify(e instanceof SyntaxError ? "Ce fichier n’est pas une sauvegarde valide." : e instanceof Error ? e.message : "L’import a échoué.", true); }
  }
  async function deletePack(pack: QuizPack) {
    try { await api("/api/quizzes", { method: "POST", body: JSON.stringify({ action: "delete", id: pack.id }) }); setCustomPacks(p => p.filter(x => x.id !== pack.id)); notify("Quiz supprimé."); }
    catch (e) { notify(e instanceof Error ? e.message : "La suppression a échoué.", true); }
  }
  function editPack(pack?: QuizPack) { setEditorPack(pack); navigate("editor"); }
  function saveProfile() {
    if (draftName.trim().length < 2) return;
    const clean = draftName.trim().slice(0, 24); setName(clean); setAvatar(draftAvatar);
    try { localStorage.setItem("quizclub-host-profile", JSON.stringify({ name: clean, avatar: draftAvatar })); } catch {}
    setDialog(null); notify("Votre nom est sur l’affiche !");
  }
  const remoteActive = room && room.status !== "lobby";
  const activeGame = view === "game" && (solo || remoteActive);

  return <div className="app-shell">
    {mobileNav && <div className="sidebar-scrim" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <button className="brand-button" onClick={() => navigate("plateau")} aria-label="Quizclub, accueil"><Brand /></button>
      <div className="workspace-label"><span className="status-dot" /> LE QG DE VOS SOIRÉES</div>
      <div className="sidebar-section-label">LE CLUB</div>
      <nav className="main-nav" aria-label="Navigation principale">
        {([{ id: "plateau", label: "Le plateau", icon: LayoutDashboard }, { id: "library", label: "Mes quiz", icon: Layers3 }, { id: "shop", label: "La boutique", icon: ShoppingBag }, { id: "leaderboard", label: "Le classement", icon: Trophy }] as const).map(item => <button key={item.id} className={`nav-item ${(view === item.id || (item.id === "plateau" && view === "game") || (item.id === "library" && view === "editor")) ? "active" : ""}`} onClick={() => navigate(item.id)}><item.icon size={19} strokeWidth={1.7} /><span>{item.label}</span>{item.id === "library" && <span className="nav-count">{ALL_PACKS.length + customPacks.length}</span>}{item.id === "shop" && <span className="nav-new-dot" />}</button>)}
      </nav>
      <div className="sidebar-separator" />
      <button className="nav-item nav-secondary" onClick={() => setDialog("join")}><Smartphone size={18} strokeWidth={1.7} /><span>Rejoindre une partie</span><ArrowUpRight size={14} /></button>
      <button className="nav-item nav-secondary" onClick={() => setDialog("rules")}><CircleHelp size={18} strokeWidth={1.7} /><span>Comment jouer</span></button><AppInstallButton className="nav-item nav-secondary nav-install" onIosHelp={() => notify("Sur iPhone/iPad : touchez Partager, puis « Sur l’écran d’accueil ».")} />
      <div className="sidebar-spacer" />
      
      <div className="sidebar-bottom"><div className="connection-line"><span className={`status-dot ${connection === "offline" ? "offline-dot" : ""}`} />{connection === "online" ? "Tout est prêt pour jouer" : connection === "connecting" ? "On prépare le plateau…" : "Reconnexion au salon…"}</div><button className="host-profile" onClick={() => { setDraftName(name); setDraftAvatar(avatar); setDialog("profile"); }}><span className="profile-avatar" style={{ background: AVATAR_COLORS[avatar] }}>{AVATARS[avatar]}</span><span><strong>{name}</strong><small>Maître du jeu</small></span><ChevronsUpDown size={15} /></button></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="topbar-location"><button className="icon-button mobile-menu" aria-label="Ouvrir le menu" onClick={() => setMobileNav(v => !v)}><Menu size={21} /></button><span className="topbar-home">Espace maître du jeu</span><ChevronRight size={13} /><span>{VIEW_LABELS[view]}</span></div><div className="topbar-actions"><span className="topbar-live"><span className="status-dot" />{remoteActive ? "Partie en cours" : "Le club est ouvert"}</span><span className="topbar-divider" /><button className={`icon-button ${sound ? "sound-on" : ""}`} onClick={changeSound} aria-label={sound ? "Couper le son" : "Activer le son"}>{sound ? <Volume2 size={19} /> : <VolumeX size={19} />}</button><button className="icon-button fullscreen-button" onClick={() => void fullscreen()} aria-label="Passer en plein écran"><Maximize size={17} /></button></div></header>
      <main className="main-content">
        {(view === "plateau" || view === "game") && <><div className="page-heading"><div><h1>{activeGame ? solo ? "À vous de faire le show." : "Le show est lancé." : "La soirée s’annonce bien."}<span className="heading-spark">✦</span></h1><p>{activeGame ? solo ? "Un peu de culture. Un peu de vitesse. Beaucoup de panache." : "Le rythme, les points, les rebondissements : vous avez les commandes." : "Réunissez la bande. Lancez le quiz. Faites des histoires."}</p></div></div>
        <div className={`dashboard-grid ${activeGame ? "playing-dashboard" : ""}`}><div className="dashboard-primary">
          {activeGame ? solo ? <SoloGame key={runKey} pack={selectedPack} name={name} sound={sound} startingBonus={startingBonus} shopEnabled={room?.shopEnabled ?? true} onExit={() => { setSolo(false); navigate("plateau"); }} onFinish={finishSolo} /> : <HostGame room={room!} onCommand={hostCommand} onExit={() => navigate("plateau")} busy={busy} /> : <>
            <section className="hero-card"><img className="hero-image" src={asset("/images/hero.webp")} alt="Un plateau de jeu cosmique violet, une sphère point d’interrogation et un anneau vert citron" fetchPriority="high" /><div className="hero-shade" /><div className="hero-content"><h2>Votre soirée.<br />Vos règles.<br /><span>Leur défaite.</span></h2><p>Le jeu de quiz qui transforme votre salon<br className="hero-line-break" /> en plateau télé. La mauvaise foi en plus.</p><div className="hero-actions"><button className="button button-primary" onClick={() => remoteActive ? (setSolo(false), navigate("game")) : openStart()}>{remoteActive ? "Reprendre la partie" : "Lancer une partie"}<ArrowUpRight size={18} /></button><button className="hero-demo-button" onClick={() => startSolo()}><span><Gamepad2 size={16} /></span>Essayer en solo</button></div><div className="hero-bottom-note"><Users size={13} /><span>2 à {MAX_PLAYERS} joueurs</span><i /><Smartphone size={12} /><span>Un téléphone suffit</span></div></div></section>
            <section className="themes-section"><div className="section-heading"><div><h2>Choisissez votre terrain de jeu<span>.</span></h2><p>Il y en a pour tous les cerveaux.</p></div><button className="text-button" onClick={() => navigate("library")}>Tous les quiz<ArrowUpRight size={14} /></button></div><div className="theme-grid">{PACKS.map((pack, i) => <button key={pack.id} className={`theme-card theme-${pack.id}`} onClick={() => openStart(pack)}><img src={pack.image} alt="" /><div className="theme-shade" /><div className="theme-card-content"><span className="theme-index">0{i + 1}</span><h3>{pack.title}</h3><span className="theme-card-meta">{pack.questions.length} questions</span></div><span className="theme-arrow"><ArrowUpRight size={17} /></span></button>)}</div></section>
                      </>}
                  </div><aside className="dashboard-aside">{remoteActive && !solo ? <LiveScores room={room} busy={busy} onCommand={hostCommand} onInvite={() => setDialog("invite")} onAdjust={id => { setAdjustId(id); setAdjustAmount("100"); }} /> : <section className="room-card panel"><div className="panel-heading"><h2>Le salon</h2><span className="pill pill-green"><span />{room?.players.length || 0}/{MAX_PLAYERS} JOUEURS</span></div><div className="room-invite-block"><button className="qr-wrap" onClick={() => setDialog("invite")} aria-label="Agrandir le QR code d’invitation">{session ? <QRCode value={inviteUrl} size={91} fgColor="#1c1829" /> : <LoaderCircle className="spin" size={30} />}</button><div className="room-code-block"><span>LE CODE DE LA SOIRÉE</span><button className="room-code" onClick={() => void copyInvite(true)} title="Copier le code">{session?.code || "••••"}<Copy size={14} /></button><p>Scannez, rejoignez.<br />C’est aussi simple que ça.</p></div></div><div className="room-player-section"><div className="room-player-title"><span>{room?.players.length ? "La bande se rassemble" : "Il ne manque que la bande"}</span><span className="status-dot" /></div>{room?.players.length ? <div className="connected-players">{room.players.map(p => <span key={p.id} className="lobby-player" title={`${p.name} · ${p.coins} pièces — cliquer pour ajuster`} role="button" tabIndex={0} onClick={() => { setAdjustId(p.id); setAdjustAmount("100"); }}><span className="player-avatar" style={{ background: AVATAR_COLORS[p.avatar] }}>{AVATARS[p.avatar]}</span><small>{p.name}</small></span>)}</div> : <div className="empty-players"><div className="empty-avatar"><Users size={17} /></div><div className="empty-avatar"><Plus size={16} /></div><div className="empty-avatar"><Plus size={16} /></div><span>À vous de faire<br />les invitations.</span></div>}</div>{room?.votingEnabled && room.players.some(p => p.vote) && <button className="room-vote-summary" onClick={() => openStart()}><Layers3 size={13} /> Le vote du salon est prêt <ArrowUpRight size={13} /></button>}<button className="button button-outline full-width" onClick={() => connection === "offline" ? void create() : setDialog("invite")}><UserPlus size={16} />{connection === "offline" ? "Reconnecter le salon" : "Inviter les amis"}<ArrowUpRight size={15} /></button></section>}
          <section className="rules-card panel"><div className="panel-heading"><h2>Votre partie, vos règles.</h2><Settings2 size={16} /></div><div className="rule-row"><span className="rule-icon"><ShoppingBag size={15} /></span><div><strong>Boutique en partie</strong><small>Des bonus pour pimenter le jeu</small></div><Toggle label="Activer la boutique en partie" checked={room?.shopEnabled ?? true} disabled={!room || busy} onChange={() => void command("settings", { shopEnabled: !room?.shopEnabled })} /></div><div className="rule-row"><span className="rule-icon"><Layers3 size={15} /></span><div><strong>Vote des thèmes</strong><small>La démocratie, version quiz</small></div><Toggle label="Activer le vote des thèmes" checked={room?.votingEnabled ?? true} disabled={!room || busy} onChange={() => void command("settings", { votingEnabled: !room?.votingEnabled })} /></div><div className="rule-row"><span className="rule-icon"><AudioLines size={15} /></span><div><strong>Ambiance sonore</strong><small>Pour se croire à la télé</small></div><Toggle label="Activer l’ambiance sonore" checked={sound} onChange={changeSound} /></div></section>
                  </aside></div></>}
        {view === "library" && <Library packs={packs} onPlay={openStart} onEdit={editPack} onCreate={() => editPack()} onDelete={pack => void deletePack(pack)} onExport={downloadBackup} onImport={file => void importBackupFile(file)} />}
        {view === "leaderboard" && <Leaderboard localScores={scores} onPlay={() => startSolo()} />}
        {view === "editor" && <QuizEditor key={editorPack?.id || "new"} initialPack={editorPack} onBack={() => navigate("library")} onSaved={pack => { setCustomPacks(p => p.some(x => x.id === pack.id) ? p.map(x => x.id === pack.id ? pack : x) : [pack, ...p]); navigate("library"); notify("Quiz sauvegardé. Votre bande n’a qu’à bien se tenir !"); }} />}
        {view === "shop" && <div className="shop-page"><div className="section-page-heading"><div><span className="eyebrow">LA BOUTIQUE</span><h1>Un petit avantage. Un grand sourire.</h1><p>Les bonnes réponses rapportent des pièces. Les pièces changent la partie.</p></div><span className="shop-page-balance"><Coins size={21} /><strong>150</strong><span>pièces au départ</span></span></div><div className="shop-product-grid">{SHOP_ITEMS.map(item => <article className="shop-product" style={{ "--product-color": item.color } as React.CSSProperties} key={item.id}><div className="product-art"><span className="product-orbit" /><span className="product-orb"><ShopItemIcon id={item.id} size={60} /></span><span className="product-star">✦</span><span className="product-mini-star">✧</span></div><span className="eyebrow">{item.id === "double" ? "POUR LES AUDACIEUX" : item.id === "hint" ? "POUR LES STRATÈGES" : "POUR LES PRUDENTS"}</span><h2>{item.name}</h2><p>{item.description}</p><div className="product-price"><strong>{item.price}</strong><Coins size={17} /><span>pièces</span></div><button className="button button-soft full-width" onClick={() => startSolo(MIX_PACK, item.id)}>Tester ce bonus en solo<ArrowUpRight size={16} /></button></article>)}</div><div className="shop-how"><div><span>01</span><h3>Jouez pour gagner.</h3><p>80 pièces pour chaque bonne réponse, et 10 pour chaque tentative.</p></div><div><span>02</span><h3>Dépensez au bon moment.</h3><p>La boutique reste ouverte pendant la partie. Le chrono, lui, continue.</p></div><div><span>03</span><h3>Gardez un peu de panache.</h3><p>Les bonus aident. Mais rien ne remplace une bonne réponse.</p></div></div></div>}
              </main>
    </div>
    {toast && <div role="status" className={`toast ${toast.error ? "toast-error" : ""}`}>{toast.error ? <CircleHelp size={18} /> : <Check size={18} />}<span>{toast.text}</span><button aria-label="Fermer la notification" onClick={() => setToast(null)}><X size={15} /></button></div>}
    {dialog === "start" && <Modal title="On fait chauffer les cerveaux ?" onClose={() => setDialog(null)}><span className="eyebrow lime">UNE SOIRÉE QUI VOUS RESSEMBLE</span><p className="modal-description">Quelques secondes pour préparer. Des heures pour en reparler.</p><label className="field-label" htmlFor="pack-select">VOTRE TERRAIN DE JEU<select className="text-input" id="pack-select" value={selectedPack.id} onChange={e => setSelectedPack(packs.find(p => p.id === e.target.value) || MIX_PACK)}>{packs.map(p => <option value={p.id} key={p.id}>{p.title} · {p.questions.length} questions</option>)}</select></label><div className="start-pack-preview"><CoverImg src={selectedPack.image} coverId={selectedPack.coverId} /><div><strong>{selectedPack.title}</strong><span>{selectedPack.description}</span><small><Clock3 size={12} /> 20 secondes par question · ~{Math.ceil(selectedPack.questions.length * 0.5)} min</small></div></div><span className="field-label">ON JOUE COMMENT ?</span><div className="mode-options"><button className={mode === "solo" ? "selected" : ""} onClick={() => setMode("solo")}><Gamepad2 size={23} /><strong>En solo</strong><span>Juste vous et votre talent.</span><i>{mode === "solo" && <Check size={12} />}</i></button><button className={mode === "host" ? "selected" : ""} onClick={() => setMode("host")}><Users size={23} /><strong>Avec les amis</strong><span>{room?.players.length || 0} joueur connecté · Jusqu’à {MAX_PLAYERS}</span><i>{mode === "host" && <Check size={12} />}</i></button></div>{mode === "host" && <div className="start-host-note"><Smartphone size={17} /><p>Les amis rejoignent le salon <strong>{session?.code || "…"}</strong> sur leur téléphone. Vous gardez les commandes.</p><button className="text-button" onClick={() => setDialog("invite")}>Inviter<ArrowUpRight size={13} /></button></div>}{startError && <p role="alert" className="form-error">{startError}</p>}<button className="button button-primary full-width start-game-button" disabled={busy} onClick={() => void startGame()}>{busy ? <LoaderCircle size={18} className="spin" /> : <Rocket size={17} />}C’est parti pour le show<ArrowRight size={18} /></button><p className="shop-footnote">{mode === "solo" ? `Vous jouez en tant que ${name}. Le chrono démarre tout de suite !` : "Vous pourrez mettre en pause, révéler les réponses et ajuster les scores."}</p></Modal>}
    {adjustId && (() => { const target = room?.players.find(p => p.id === adjustId); if (!target) return null; const value = Math.abs(parseInt(adjustAmount, 10) || 0); const send = (field: "score" | "coins", sign: 1 | -1) => { if (value) void command("award", { playerId: target.id, amount: sign * value, field }); }; return <Modal title={`Ajuster ${target.name}`} onClose={() => setAdjustId(null)}><p className="modal-description">Actuellement : <strong>{formatScore(target.score)} points</strong> et <strong>{target.coins} pièces</strong>. Les pièces restent dans son portefeuille d’une soirée à l’autre.</p><label className="field-label" htmlFor="adjust-amount">MONTANT<input id="adjust-amount" className="text-input adjust-input" type="number" inputMode="numeric" min={1} value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} /></label><div className="adjust-presets">{[50, 100, 250, 500, 1000].map(v => <button key={v} type="button" className={value === v ? "active" : ""} onClick={() => setAdjustAmount(String(v))}>{v}</button>)}</div><div className="adjust-grid"><span>Points</span><button className="button button-soft" disabled={busy || !value} onClick={() => send("score", -1)}><Minus size={15} /> Retirer</button><button className="button button-primary" disabled={busy || !value} onClick={() => send("score", 1)}><Plus size={15} /> Ajouter</button><span>Pièces</span><button className="button button-soft" disabled={busy || !value} onClick={() => send("coins", -1)}><Minus size={15} /> Retirer</button><button className="button button-primary" disabled={busy || !value} onClick={() => send("coins", 1)}><Coins size={15} /> Ajouter</button></div></Modal>; })()}
    {dialog === "invite" && <Modal title="Rameutez la bande." onClose={() => setDialog(null)}><p className="modal-description">Un téléphone, un pseudo et c’est parti.<br />Aucun compte à créer. Promis.</p><div className="invite-large-qr">{session ? <QRCode value={inviteUrl} size={190} fgColor="#1c1829" /> : <LoaderCircle className="spin" size={40} />}</div><div className="invite-large-code"><span>LE CODE DE VOTRE SALON</span><button onClick={() => void copyInvite(true)}>{session?.code || "••••"}<Copy size={19} /></button></div><button className="button button-primary full-width" onClick={() => void copyInvite()}><Copy size={16} /> Copier le lien d’invitation<ArrowUpRight size={16} /></button><a className="button button-ghost full-width" href={inviteUrl || `${BASE}/join/`} target="_blank" rel="noreferrer">Ouvrir l’écran joueur<ExternalLink size={15} /></a><p className="shop-footnote">Gardez cet écran ouvert sur votre PC. Les joueurs rejoignent le même lien depuis leur mobile.</p></Modal>}
    {dialog === "rules" && <Modal title="Le petit guide du club." onClose={() => setDialog(null)} wide><p className="modal-description">Pas besoin d’un bac +5 en soirées réussies.</p><div className="guide-steps"><div><span>01</span><div><h3>Le salon, c’est votre plateau.</h3><p>Partagez le QR code ou le lien du salon. Les joueurs choisissent leur pseudo et leur avatar sur leur téléphone. De 1 à {MAX_PLAYERS} participants, plus un maître du jeu.</p></div><Smartphone size={24} /></div><div><span>02</span><div><h3>Les bonnes réponses ont de la valeur.</h3><p>20 secondes, 4 réponses et 500 à 1 000 points selon votre rapidité. En solo, enchaînez les bonnes réponses pour un bonus de série. Touchez une réponse ou utilisez les touches 1 à 4.</p></div><Zap size={24} /></div><div><span>03</span><div><h3>Un peu de stratégie ne fait pas de mal.</h3><p>Chaque bonne réponse rapporte 80 pièces. Achetez un 50 / 50, une double mise ou un filet de sécurité. Avant la partie, les joueurs peuvent voter pour leur thème préféré.</p></div><ShoppingBag size={24} /></div><div><span>04</span><div><h3>Le maître du jeu a le dernier mot.</h3><p>L’hôte révèle les réponses, passe à la suite et peut ajouter ou retirer 100 points à un joueur. Le chrono se met en pause avec P. Espace permet de révéler ou de passer à la suite.</p></div><Crown size={24} /></div></div><div className="guide-shortcuts"><span><kbd>1</kbd>–<kbd>4</kbd> Répondre</span><span><kbd>P</kbd> Pause</span><span><kbd>Espace</kbd> Question suivante</span></div><button className="button button-primary full-width" onClick={() => setDialog(null)}>J’ai tout compris. Place au jeu !<ArrowRight size={17} /></button></Modal>}
    {dialog === "profile" && <Modal title="Votre nom sur l’affiche." onClose={() => setDialog(null)}><p className="modal-description">Choisissez un pseudo à la hauteur de votre réputation.</p><label className="field-label" htmlFor="profile-name">VOTRE PSEUDO<input id="profile-name" className="text-input" value={draftName} onChange={e => setDraftName(e.target.value)} maxLength={24} onKeyDown={e => { if (e.key === "Enter") saveProfile(); }} /></label><span className="field-label">VOTRE AVATAR</span><div className="avatar-picker">{AVATARS.map((a, i) => <button key={a} className={draftAvatar === i ? "selected" : ""} aria-label={`Avatar ${a}`} aria-pressed={draftAvatar === i} style={{ background: `${AVATAR_COLORS[i]}20` }} onClick={() => setDraftAvatar(i)}>{a}{draftAvatar === i && <span><Check size={11} /></span>}</button>)}</div><button className="button button-primary full-width" disabled={draftName.trim().length < 2} onClick={saveProfile}>Ça, c’est moi<Check size={17} /></button></Modal>}
    {dialog === "join" && <Modal title="Votre place est dans le salon." onClose={() => setDialog(null)}><p className="modal-description">L’hôte vous a donné un code ? Entrez-le ici et rejoignez la partie sur cet appareil.</p><label className="field-label" htmlFor="join-code">LE CODE DU SALON<input id="join-code" className="text-input code-input" placeholder="ABCD" maxLength={6} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} onKeyDown={e => { if (e.key === "Enter" && joinCode.length >= 4) window.location.href = `${BASE}/join/?code=${joinCode}`; }} /></label><a className={`button button-primary full-width ${joinCode.length < 4 ? "disabled-link" : ""}`} href={joinCode.length >= 4 ? `${BASE}/join/?code=${joinCode}` : undefined}>Rejoindre la bande<ArrowRight size={17} /></a></Modal>}
  </div>;
}

function LiveScores({ room, busy, onCommand, onInvite, onAdjust }: { room: RoomSnapshot; busy: boolean; onCommand: (action: string, data?: Record<string, unknown>) => Promise<void>; onInvite: () => void; onAdjust: (playerId: string) => void }) {
  const ranking = [...room.players].sort((a, b) => b.score - a.score);
  return <section className="live-scores panel"><div className="panel-heading"><h2>Le classement live</h2><span className="live-pulse" /></div><button className="live-room-code" onClick={onInvite}>SALON <strong>{room.code}</strong><Users size={13} />{room.players.length}/{MAX_PLAYERS}<ArrowUpRight size={13} /></button><div className="live-score-rows">{ranking.map((p, i) => <div className="live-score-row" key={p.id}><span className={`live-rank ${i === 0 ? "lime" : ""}`}>{i === 0 ? <Crown size={15} /> : i + 1}</span><span className="player-avatar" style={{ background: AVATAR_COLORS[p.avatar] }}>{AVATARS[p.avatar]}</span><div className="live-player-info"><strong>{p.name}</strong><span>{formatScore(p.score)} pts · {p.coins} pièces {p.hasAnswered && room.status === "playing" && <Check size={11} />}</span></div><div className="award-buttons"><button onClick={() => void onCommand("award", { playerId: p.id, amount: -100 })} disabled={busy} aria-label={`Retirer 100 points à ${p.name}`}><Minus size={12} /></button><button onClick={() => void onCommand("award", { playerId: p.id, amount: 100 })} disabled={busy} aria-label={`Ajouter 100 points à ${p.name}`}><Plus size={12} /></button><button onClick={() => onAdjust(p.id)} disabled={busy} aria-label={`Ajuster les points et pièces de ${p.name}`} title="Ajuster"><Settings2 size={12} /></button></div></div>)}</div><p className="live-scores-note"><Crown size={13} /> ± 100 points, ou ⚙ pour ajuster librement points et pièces.</p></section>;
}
