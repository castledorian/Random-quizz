# Random Quizz

Jeu de quiz de soirée façon Jackbox : l'hôte ouvre un salon, les amis le rejoignent depuis leur téléphone (code ou QR code). Mode solo, quiz personnalisés, boutique de bonus et classement inclus.

**100 % statique, hébergé sur GitHub Pages** : aucun serveur, aucune base de données.

- Les salons fonctionnent en direct entre appareils (WebRTC via [PeerJS](https://peerjs.com)) : l'appareil de l'hôte fait office de serveur, **sa page doit rester ouverte** pendant la partie.
- Les quiz personnalisés, les scores et les profils sont enregistrés dans le navigateur (`localStorage`).

## Publication

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. Chaque `git push` sur `main` construit et publie le site (workflow `.github/workflows/deploy.yml`).

Le site est disponible sur `https://<utilisateur>.github.io/<depot>/`.

## Développement local

```bash
npm install
npm run dev
```
