# CA-6 — LES ROUGES, lus contre l'état d'avant (la spec seule ; aucune réparation)

Joués le 14/11/2026 sur le commit de la table + `e2e/specs/ca6-carte.e2e.ts`, non commité à cet instant.
Playwright 1.50.1, serveurs de développement, base `zwadj_e2e` (PostgreSQL 16 + `uuidv7` de substitution : conteneur cloud),
Chromium 1243 relié au chemin de la révision 1155 attendue. Sortie : `e2e-ca6.txt` — lignes `[WebServer]` RETIRÉES (elles
portent des jetons de vérification d'e-mail) ; « token= » restant dans la pièce : 0 (compté).
Bilan lu : `3 failed`, `5 passed` (dont l'échauffement).

| test | verdict | lecture |
|---|---|---|
| fr, recherche | ✘ | assertion web-first expirée : `expect(locator).toHaveText` sur `.map-venue-card-name`, « element(s) not found ». Tout ce qui PRÉCÈDE dans le test est passé (aucune tuile ni morceau de carte avant le geste, points = ceux de l'API, salles sans position dites). ⛔ DÉFAUT RÉEL, attendu (table) : la touche Entrée sur un point n'ouvre pas la carte de la salle. |
| ar, recherche (360 px) | ✘ | le même défaut, à la même ligne. |
| panne des tuiles | ✓ | le message est affiché, les points restent. |
| panne de la route de points (500) | ✓ | message, « Réessayer », puis la carte. |
| accueil | ✘ | `expect(received).toEqual(expected)` : 22 tuiles demandées AU CHARGEMENT de la page (attendu : aucune). ⛔ SECOND DÉFAUT RÉEL, non prévu à l'ouverture : la page d'accueil de la base de test est courte ; à 700 px de haut la section carte est déjà dans la marge d'approche (400 px) à l'ouverture, et la carte se monte sans que le visiteur ait fait défiler. R-9 dit « quand la section approche de l'écran, PAS au chargement de la page ». Le test de composant de CA-3 ne pouvait pas le voir (son observateur est un double). ⇒ EXTENSION de la table. |
| fiche | ✓ | la carte au geste, un point au nom de la salle ; salle sans position : ni bouton ni carte. |
| pro | ✓ | un clic écrit les deux champs ; un second clic déplace le point. |

## Empreinte sha256 de la spec jouée
    f20bc58349fe10c56d10c53e22392d298dc6fb89d858e93192e5d43eaa47ef44  e2e/specs/ca6-carte.e2e.ts
