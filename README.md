# Random Quizz

Jeu de quiz de soirée façon Jackbox : un hôte crée une salle, les joueurs rejoignent depuis leur téléphone (code ou QR code). Mode solo, quiz personnalisés et classement inclus.

Stack : Next.js, React, Tailwind, PostgreSQL (Drizzle ORM).

## Lancer en local

```bash
npm install
cp .env.example .env   # puis adapter DATABASE_URL
npm run db:push        # crée les tables
npm run dev
```

## Déployer (Vercel + Neon, gratuit)

GitHub Pages ne convient pas : l'app a besoin d'un serveur Next.js et de PostgreSQL.

1. Créer une base sur [neon.tech](https://neon.tech) et copier l'URL de connexion (« pooled »).
2. Créer les tables depuis ton ordinateur :
   ```bash
   DATABASE_URL="<url neon>" npm run db:push
   ```
3. Sur [vercel.com](https://vercel.com) : **Add New → Project**, importer ce dépôt GitHub.
4. Dans *Environment Variables*, ajouter `DATABASE_URL` avec l'URL Neon, puis **Deploy**.

Chaque `git push` sur `main` redéploie automatiquement.
