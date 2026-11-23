import { asset } from "@/lib/base";

/**
 * Galerie d'affiches pour les quiz. Les images se déposent dans public/images/covers/<id>.png ;
 * tant qu'une image est absente, une vignette colorée avec son emoji la remplace.
 */
export const COVERS = [
  { id: "pop-culture", label: "Pop culture", emoji: "🎮", from: "#7f55e0", to: "#2a1b5c" },
  { id: "world", label: "Tour du monde", emoji: "🌍", from: "#3fb9a0", to: "#123e4a" },
  { id: "food", label: "À table !", emoji: "🍕", from: "#f4a66d", to: "#6b2d1f" },
  { id: "cinema", label: "Cinéma & séries", emoji: "🎬", from: "#e0556e", to: "#3a1230" },
  { id: "music", label: "Musique", emoji: "🎵", from: "#5b7cf0", to: "#1c1b4d" },
  { id: "sport", label: "Sport", emoji: "⚽", from: "#4cc27a", to: "#124a2c" },
  { id: "science", label: "Sciences", emoji: "🔬", from: "#37b6d9", to: "#12315a" },
  { id: "history", label: "Histoire", emoji: "🏛️", from: "#c9a063", to: "#4a3318" },
  { id: "nature", label: "Nature", emoji: "🌿", from: "#7cc45a", to: "#1d4a22" },
  { id: "animals", label: "Animaux", emoji: "🦊", from: "#f09a4f", to: "#5a2a14" },
  { id: "party", label: "Soirée", emoji: "🎉", from: "#d46be0", to: "#3b1550" },
  { id: "friends", label: "Entre amis", emoji: "🫶", from: "#f27aa5", to: "#4d1a3a" },
  { id: "travel", label: "Voyage", emoji: "✈️", from: "#56a8f5", to: "#16315c" },
  { id: "tech", label: "Technologie", emoji: "💻", from: "#6f7bf7", to: "#1a1f52" },
  { id: "art", label: "Art", emoji: "🎨", from: "#f2c14e", to: "#5a3a12" },
  { id: "mystery", label: "Mystère", emoji: "🔮", from: "#9a63e8", to: "#1d1038" },
] as const;

export const coverUrl = (id: string) => asset(`/images/covers/${id}.png`);
export const isCoverId = (id: string) => COVERS.some(c => c.id === id);
export function validCover(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 400000) return false;
  if (value.startsWith("cover:")) return isCoverId(value.slice(6));
  return /^data:image\/(jpeg|png|webp);base64,/.test(value) || /^https?:\/\/\S+$/i.test(value);
}
/** Transforme la valeur enregistrée (« cover:food », data-URL ou lien) en image affichable. */
export function resolveCover(cover?: string): { image: string; coverId?: string } {
  if (cover?.startsWith("cover:")) { const id = cover.slice(6); if (isCoverId(id)) return { image: coverUrl(id), coverId: id }; }
  if (cover) return { image: cover };
  return { image: asset("/images/quiz-universe.svg") };
}
