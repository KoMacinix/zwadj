# D344 — écarts entre les copies et les archives (R-2)

R-2 : « chaque spec est COPIÉE dans e2e/specs/, jamais déplacée. Tout écart entre la copie et l'archive est un diff déclaré dans la table et motivé ligne par ligne. » Les archives ne sont pas touchées (D295) : `git diff` des deux fichiers archivés = 0 ligne.

## r30 — `e2e/specs/r30-lien-calendrier-pro.e2e.ts` (copie COMMITÉE)

Copie **identique à l'octet** de `docs/preuves/D322/navigateur/r30-lien-calendrier-pro.e2e.ts` : `cmp` sans différence ; sha256 `2f11ca72d3abd29bed246a006fb639915f36108a7a70a05d2210795168fae5be` pour les deux ; 36 CRLF, 36 LF (CRLF partout). **Aucun écart** : l'archive était déjà écrite avec les chemins d'import de la suite (`../../packages/i18n/messages/fr.json`, `../playwright.config`, `../fixtures/harness`, résolus depuis `e2e/specs/` — contrôle 8 de la lecture adverse).

## r32 — `e2e/specs/r32-nouvelle-reservation.e2e.ts` (copie JOUÉE puis RETIRÉE, jamais commitée)

Pour mémoire, parce que la copie a été jouée (D334, item 5) : cinq changements, aucun sur une assertion — les quatre chemins d'import (`../../../../packages/i18n/messages/fr.json` devient `../../packages/i18n/messages/fr.json` ; idem `ar.json` ; `../../../../e2e/playwright.config` devient `../playwright.config` ; `../../../../e2e/fixtures/harness` devient `../fixtures/harness`) et le paragraphe d'en-tête « ⛔ PLACE : CETTE SPEC N'EST PAS DANS LA SUITE… » (6 lignes) remplacé par un paragraphe de 4 lignes qui dit qu'elle y est revenue. La copie n'est PAS dans le dépôt : **r32 ne revient pas** (`arret-spec.md`). Empreinte de la copie jouée : `neutralisation-e2e/empreintes.txt`.
