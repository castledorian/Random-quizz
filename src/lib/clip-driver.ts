import { clipSource, type QuestionMedia } from "@/lib/game";

/**
 * Lecture d'extraits (YouTube ou fichier direct) avec préchargement, début/fin précis
 * et fondus sonores. Le lecteur est créé à l'avance (« échauffement ») pour démarrer sans attente.
 */
export type ClipState = "loading" | "ready" | "playing" | "ended" | "error";
export type ClipDriver = { start: () => void; stop: () => void; destroy: () => void };
type Hooks = { onState: (state: ClipState) => void };

const FADE_SECONDS = 1.5;
const smooth = (g: number) => g * g * (3 - 2 * g);
function gainAt(t: number, start: number, end: number | undefined, fade: number) {
  if (!fade) return 1;
  const up = (t - start) / fade;
  const down = end === undefined ? 1 : (end - t) / fade;
  return smooth(Math.max(0, Math.min(1, up, down)));
}
const fadeLength = (media: QuestionMedia) => {
  if (media.fade === false) return 0;
  return media.end !== undefined ? Math.min(FADE_SECONDS, Math.max(0.2, (media.end - (media.start ?? 0)) / 3)) : FADE_SECONDS;
};

/* ───────────── YouTube (API IFrame) ───────────── */
interface YTPlayer { playVideo(): void; pauseVideo(): void; seekTo(seconds: number, allowSeekAhead: boolean): void; mute(): void; unMute(): void; setVolume(volume: number): void; getCurrentTime(): number; getDuration(): number; destroy(): void }
interface YTNamespace { Player: new (element: HTMLElement, options: object) => YTPlayer }
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }
let ytPromise: Promise<YTNamespace> | null = null;
function loadYouTube(): Promise<YTNamespace> {
  ytPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) { resolve(window.YT); return; }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); if (window.YT) resolve(window.YT); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api"; script.async = true;
    script.onerror = () => { ytPromise = null; reject(new Error("YouTube indisponible")); };
    document.head.appendChild(script);
    window.setTimeout(() => { if (!window.YT?.Player) { ytPromise = null; reject(new Error("YouTube ne répond pas")); } }, 15000);
  });
  return ytPromise;
}

function youtubeDriver(host: HTMLElement, id: string, media: QuestionMedia, hooks: Hooks): ClipDriver {
  const start = media.start ?? 0;
  const fade = fadeLength(media);
  const mount = document.createElement("div");
  host.appendChild(mount);
  let player: YTPlayer | null = null;
  let ready = false, warming = true, destroyed = false, wanted = false, running = false;
  let loop = 0, watchdog = 0, fadeOutTimer = 0;

  const volume = (g: number) => { try { player?.setVolume(Math.round(g * 100)); } catch { /* Lecteur en cours de fermeture. */ } };
  const halt = () => { window.clearInterval(loop); window.clearTimeout(watchdog); window.clearTimeout(fadeOutTimer); running = false; };
  const finish = () => { halt(); wanted = false; try { player?.pauseVideo(); } catch { /* Ignoré. */ } hooks.onState("ended"); };
  function begin() {
    if (!player) return;
    halt(); warming = false; running = true;
    try {
      volume(fade ? 0 : 1); player.seekTo(start, true); player.unMute(); player.playVideo();
    } catch { hooks.onState("error"); return; }
    watchdog = window.setTimeout(() => { if (running) hooks.onState("ready"); }, 4000);
    loop = window.setInterval(() => {
      if (!player) return;
      const t = player.getCurrentTime();
      const end = media.end ?? (player.getDuration() || undefined);
      if (end !== undefined && t >= end - 0.04) { finish(); return; }
      if (t >= start) volume(gainAt(t, start, end, fade));
    }, 50);
  }
  function onState(code: number) {
    if (destroyed || !player) return;
    if (warming) {
      if (code === 1) { try { player.pauseVideo(); player.seekTo(start, true); } catch { /* Ignoré. */ } warming = false; hooks.onState("ready"); if (wanted) begin(); }
      return;
    }
    if (code === 1 && running) { window.clearTimeout(watchdog); hooks.onState("playing"); }
    else if (code === 0 && running) finish();
  }
  loadYouTube().then(YT => {
    if (destroyed) return;
    player = new YT.Player(mount, {
      width: "100%", height: "100%", videoId: id, host: "https://www.youtube-nocookie.com",
      playerVars: { controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, playsinline: 1, start, enablejsapi: 1, origin: window.location.origin },
      events: {
        onReady: () => { ready = true; try { player?.mute(); player?.seekTo(start, true); player?.playVideo(); } catch { /* Ignoré. */ } if (wanted) begin(); },
        onStateChange: (event: { data: number }) => onState(event.data),
        onError: () => hooks.onState("error"),
      },
    });
  }).catch(() => hooks.onState("error"));
  hooks.onState("loading");
  return {
    start() { wanted = true; if (ready) begin(); },
    stop() {
      wanted = false;
      if (!player || !running) return;
      halt();
      let g = 1; const step = window.setInterval(() => { g -= 0.2; volume(Math.max(0, g)); }, 60);
      fadeOutTimer = window.setTimeout(() => { window.clearInterval(step); try { player?.pauseVideo(); } catch { /* Ignoré. */ } if (!destroyed) hooks.onState("ready"); }, 320);
    },
    destroy() { destroyed = true; halt(); try { player?.destroy(); } catch { /* Ignoré. */ } mount.remove(); },
  };
}

/* ───────────── Fichier direct (mp4, webm, mp3…) ───────────── */
function fileDriver(host: HTMLElement, url: string, media: QuestionMedia, hooks: Hooks): ClipDriver {
  const start = media.start ?? 0;
  const fade = fadeLength(media);
  const el = document.createElement("video");
  el.preload = "auto"; el.playsInline = true; el.controls = false; el.disablePictureInPicture = true;
  el.setAttribute("controlslist", "nodownload noremoteplayback"); el.src = url;
  host.appendChild(el);
  let destroyed = false, wanted = false, running = false, loop = 0, fadeOutTimer = 0;
  const halt = () => { window.clearInterval(loop); window.clearTimeout(fadeOutTimer); running = false; };
  const finish = () => { halt(); wanted = false; el.pause(); hooks.onState("ended"); };
  const seek = () => { try { el.currentTime = start; } catch { /* Métadonnées pas encore prêtes. */ } };
  function begin() {
    halt(); running = true; seek(); el.volume = fade ? 0 : 1;
    el.play().then(() => {
      if (destroyed || !running) return;
      hooks.onState("playing");
      let retries = 0;
      loop = window.setInterval(() => {
        if (el.currentTime < start - 0.25 && retries++ < 6) { seek(); return; }
        const end = media.end ?? (Number.isFinite(el.duration) ? el.duration : undefined);
        if (end !== undefined && el.currentTime >= end - 0.04) { finish(); return; }
        el.volume = gainAt(el.currentTime, start, end, fade);
      }, 50);
    }).catch(() => { halt(); hooks.onState("ready"); });
  }
  el.addEventListener("loadedmetadata", () => { seek(); hooks.onState("ready"); if (wanted) begin(); });
  el.addEventListener("ended", () => { if (running) finish(); });
  el.addEventListener("error", () => hooks.onState("error"));
  hooks.onState("loading");
  el.load();
  return {
    start() { wanted = true; if (el.readyState >= 1) begin(); },
    stop() {
      wanted = false;
      if (!running) return;
      halt();
      const step = window.setInterval(() => { el.volume = Math.max(0, el.volume - 0.2); }, 60);
      fadeOutTimer = window.setTimeout(() => { window.clearInterval(step); el.pause(); if (!destroyed) hooks.onState("ready"); }, 320);
    },
    destroy() { destroyed = true; halt(); el.pause(); el.removeAttribute("src"); el.load(); el.remove(); },
  };
}

export function createClipDriver(host: HTMLElement, media: QuestionMedia, hooks: Hooks): ClipDriver | null {
  const source = clipSource(media.url);
  if (!source) return null;
  return source.type === "youtube" ? youtubeDriver(host, source.id, media, hooks) : fileDriver(host, source.url, media, hooks);
}
export const clipKey = (m: QuestionMedia) => `${m.url}|${m.start ?? ""}|${m.end ?? ""}|${m.fade === false ? 0 : 1}`;
