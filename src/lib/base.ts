/** Préfixe du site (GitHub Pages sert le projet sous /<nom-du-depot>). */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const asset = (path: string) => `${BASE}${path}`;
