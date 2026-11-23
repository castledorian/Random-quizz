import type { DataConnection, Peer } from "peerjs";
import { MIX_PACK, type RoomSnapshot } from "@/lib/game";
import { ApiError } from "@/lib/api-error";
import { handleRoomRequest, newRoomState, type RoomState, type RpcRequest, type RpcResponse } from "@/lib/room-engine";

/**
 * Transport temps réel sans serveur : le navigateur de l'hôte détient la salle,
 * les joueurs s'y connectent en WebRTC (PeerJS) avec le code du salon.
 */
const ROOM_KEY = "quizclub-host-room-v2";
const peerId = (code: string) => `quizclub-${code.toLowerCase()}`;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type PeerError = Error & { type?: string };
async function loadPeer() { return (await import("peerjs")).Peer; }
function openPeer(Peer: typeof import("peerjs").Peer, id?: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
    const timer = setTimeout(() => { peer.destroy(); reject(new ApiError("Le service de connexion ne répond pas. Vérifiez votre réseau.", 503)); }, 12000);
    peer.once("open", () => { clearTimeout(timer); resolve(peer); });
    peer.once("error", (error: PeerError) => { clearTimeout(timer); peer.destroy(); reject(error); });
  });
}

/* ───────────── Côté hôte ───────────── */
let live: { room: RoomState; peer: Peer } | null = null;

function persist(room: RoomState) {
  try { localStorage.setItem(ROOM_KEY, JSON.stringify(room)); } catch { /* Stockage plein : la partie continue en mémoire. */ }
}
function serve(peer: Peer, room: RoomState) {
  peer.on("connection", (conn: DataConnection) => {
    conn.on("data", raw => {
      const req = raw as RpcRequest;
      if (!req || typeof req.id !== "string" || typeof req.url !== "string") return;
      const { status, data } = handleRoomRequest(room, { ...req, headers: req.headers || {} }, persist);
      const response: RpcResponse = { id: req.id, status, data, serverTime: Date.now() };
      if (conn.open) conn.send(response);
    });
  });
  peer.on("disconnected", () => { if (!peer.destroyed) peer.reconnect(); });
}
async function host(room: RoomState, attempts: number): Promise<Peer> {
  const Peer = await loadPeer();
  for (let i = 0; ; i++) {
    try { return await openPeer(Peer, peerId(room.code)); }
    catch (error) {
      if ((error as PeerError).type === "unavailable-id" && i < attempts - 1) { await sleep(1500); continue; }
      throw error;
    }
  }
}

const randomCode = () => Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.getRandomValues(new Uint32Array(1))[0] % CODE_ALPHABET.length]).join("");

export async function createHostRoom(replace = false): Promise<{ code: string; hostToken: string }> {
  if (live && !replace) return { code: live.room.code, hostToken: live.room.hostToken };
  const previous = live;
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    if (previous && code === previous.room.code) continue;
    const room = newRoomState(code, MIX_PACK.questions, MIX_PACK.title);
    if (previous) { room.shopEnabled = previous.room.shopEnabled; room.votingEnabled = previous.room.votingEnabled; }
    try {
      const peer = await host(room, 1);
      serve(peer, room); live = { room, peer }; persist(room);
      if (previous) { previous.room.closed = true; setTimeout(() => previous.peer.destroy(), 90000); }
      return { code, hostToken: room.hostToken };
    } catch (error) {
      if ((error as PeerError).type === "unavailable-id") continue;
      throw new ApiError("Impossible d’ouvrir le salon. Vérifiez votre connexion et réessayez.", 503);
    }
  }
  throw new ApiError("Un peu trop de monde sur le plateau ! Réessayez.", 503);
}
async function resumeHostRoom(code: string, hostToken: string | null): Promise<RoomState> {
  if (live?.room.code === code) return live.room;
  let saved: RoomState | null = null;
  try { saved = JSON.parse(localStorage.getItem(ROOM_KEY) || "null"); } catch { /* Salle introuvable. */ }
  if (!saved || saved.code !== code || !hostToken || saved.hostToken !== hostToken) throw new ApiError("Ce salon est introuvable. Vérifiez votre code.", 404);
  if (saved.status === "playing") { saved.status = "paused"; saved.remainingSeconds = Math.max(1, saved.remainingSeconds); saved.questionStartedAt = null; }
  try {
    const peer = await host(saved, 5);
    serve(peer, saved); live = { room: saved, peer };
    return saved;
  } catch { throw new ApiError("Ce salon est introuvable. Vérifiez votre code.", 404); }
}

/* ───────────── Côté joueur ───────────── */
let clientPeer: Peer | null = null;
const connections = new Map<string, DataConnection>();
const waiting = new Map<string, { resolve: (r: RpcResponse) => void; timer: ReturnType<typeof setTimeout> }>();
let media: { id: string; url: string } | null = null;

async function getConnection(code: string): Promise<DataConnection> {
  const known = connections.get(code);
  if (known?.open) return known;
  if (!clientPeer || clientPeer.destroyed) { const Peer = await loadPeer(); clientPeer = await openPeer(Peer); }
  else if (clientPeer.disconnected) clientPeer.reconnect();
  const peer = clientPeer;
  return new Promise((resolve, reject) => {
    const conn = peer.connect(peerId(code), { reliable: true });
    const fail = (message: string, status = 503) => { cleanup(); conn.close(); reject(new ApiError(message, status)); };
    const timer = setTimeout(() => fail("Impossible de joindre l’hôte. Vérifiez que sa page est toujours ouverte."), 12000);
    const onPeerError = (error: PeerError) => { if (error.type === "peer-unavailable") fail("Ce salon est introuvable. Vérifiez votre code.", 404); };
    const cleanup = () => { clearTimeout(timer); peer.off("error", onPeerError); };
    peer.on("error", onPeerError);
    conn.on("open", () => {
      cleanup(); connections.set(code, conn);
      conn.on("data", raw => {
        const res = raw as RpcResponse; const pending = waiting.get(res.id);
        if (pending) { clearTimeout(pending.timer); waiting.delete(res.id); pending.resolve(res); }
      });
      conn.on("close", () => { if (connections.get(code) === conn) connections.delete(code); });
      resolve(conn);
    });
    conn.on("error", () => fail("La connexion avec l’hôte a été interrompue."));
  });
}
function remoteCall(code: string, method: "GET" | "POST", url: string, headers: Record<string, string>, body?: string): Promise<RpcResponse> {
  return getConnection(code).then(conn => new Promise<RpcResponse>((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => { waiting.delete(id); connections.delete(code); conn.close(); reject(new ApiError("L’hôte ne répond plus. Vérifiez que sa page est toujours ouverte.", 504)); }, 8000);
    waiting.set(id, { resolve, timer });
    conn.send({ id, method, url, headers: media ? { ...headers, "x-media-have": media.id } : headers, body } satisfies RpcRequest);
  }));
}
/** Recale l'horloge du joueur sur celle de l'hôte et réinjecte le média déjà reçu. */
function adaptSnapshot(res: RpcResponse) {
  const snap = res.data as RoomSnapshot;
  if (!snap || typeof snap !== "object" || !("status" in snap)) return;
  const offset = Date.now() - res.serverTime;
  if (snap.startedAt) snap.startedAt = new Date(new Date(snap.startedAt).getTime() + offset).toISOString();
  if (snap.status === "lobby") media = null;
  if (snap.question?.mediaUrl) media = { id: snap.question.id, url: snap.question.mediaUrl };
  else if (snap.question && media?.id === snap.question.id) snap.question.mediaUrl = media.url;
}

/* ───────────── Point d'entrée des appels /api/rooms ───────────── */
export async function roomsApi(method: "GET" | "POST", url: string, headers: Record<string, string>, body?: string): Promise<{ status: number; data: unknown }> {
  const parsed = new URL(url, "http://local");
  const code = (decodeURIComponent(parsed.pathname.split("/").filter(Boolean)[2] || "") || parsed.searchParams.get("code") || "").toUpperCase();
  if (!code) {
    if (method !== "POST") throw new ApiError("Indiquez le code du salon.");
    let action: unknown; try { action = JSON.parse(body || "{}").action; } catch { /* Corps vide. */ }
    if (action === "renew") {
      if (!live || !headers["x-host-token"] || live.room.hostToken !== headers["x-host-token"]) throw new ApiError("Seul le maître du jeu peut changer le code.", 403);
      return { status: 201, data: await createHostRoom(true) };
    }
    return { status: 201, data: await createHostRoom() };
  }
  if (live?.room.code === code || (headers["x-host-token"] && !headers["x-player-token"])) {
    const room = await resumeHostRoom(code, headers["x-host-token"] ?? null);
    return handleRoomRequest(room, { id: "local", method, url, headers, body }, persist);
  }
  const res = await remoteCall(code, method, url, headers, body);
  adaptSnapshot(res);
  return { status: res.status, data: res.data };
}
