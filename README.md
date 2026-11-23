# Random Quiz

Jeu de quiz de soirée façon Jackbox : l'hôte ouvre un salon, les amis le rejoignent depuis leur téléphone (code ou QR code). Mode solo, quiz personnalisés, boutique de bonus et classement inclus.

**100 % statique, hébergé sur GitHub Pages** : aucun serveur, aucune base de données.

- **Tout est hébergé en local, sur l'appareil de l'hôte.** Les salons fonctionnent en direct entre appareils (WebRTC via [PeerJS](https://peerjs.com)) : le navigateur de l'hôte fait office de serveur, **sa page doit rester ouverte** pendant la partie. Les quiz, les scores et les profils sont enregistrés dans son navigateur (`localStorage`) : il faut donc toujours lancer les parties depuis le même appareil et le même navigateur.
- **Sauvegarde des quiz.** La bibliothèque propose une **exportation et une importation au format JSON** pour conserver ses quiz sans risque de les perdre (changement d'ordinateur, navigateur réinitialisé). L'export contient les quiz, pas encore les profils ni les scores.
- **Profils et scores des joueurs.** À sa première connexion, chaque joueur reçoit un **identifiant unique**, enregistré dans le navigateur de son téléphone. Cet identifiant lui permet de retrouver ses pièces, ses statistiques et son classement d'une soirée à l'autre.
- **Changement de téléphone.** Un nouveau téléphone n'a pas encore d'identifiant : il crée un nouveau profil. Le maître du jeu peut alors **fusionner** l'ancien et le nouveau profil depuis le classement (onglet « Les joueurs ») : pièces et statistiques sont additionnées, et le nouveau téléphone est reconnu automatiquement ensuite.

## Publication

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. Chaque `git push` sur `main` construit et publie le site (workflow `.github/workflows/deploy.yml`).

Le site est disponible sur `https://<utilisateur>.github.io/<depot>/`.

## Réseaux stricts (relais TURN, facultatif)

Par défaut, les téléphones se connectent à l'hôte en direct (WebRTC, avec des serveurs STUN publics). Certains réseaux (Wi-Fi d'entreprise, d'hôtel, d'école) bloquent ce mode. Pour les contourner, ajoutez un relais TURN dans les réglages du dépôt (Settings > Secrets and variables > Actions) :

- variable `TURN_URLS` : une ou plusieurs adresses séparées par des virgules, par exemple `turn:relais.exemple.org:443?transport=tcp`
- secrets `TURN_USERNAME` et `TURN_CREDENTIAL`

Ces valeurs sont intégrées au site publié et donc visibles par ses visiteurs : utilisez un compte à usage limité.

## Thèmes d'origine

Le site propose trois thèmes de 20 questions et un « grand mélange ». Chaque thème peut être retiré de la bibliothèque (« Mes quiz ») puis rétabli. Ce choix est propre à l'appareil et inclus dans la sauvegarde JSON.

## Développement local

```bash
npm install
npm run dev
```
