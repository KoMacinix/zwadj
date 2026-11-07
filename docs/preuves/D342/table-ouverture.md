# D342 — rang 45 — table d'ouverture

Lot : **l'intégration, dans `main`, de la branche `front-client`** (session cloud des 05 et 06/11/2026, dix-sept lots FC-1 à FC-12 et FP-1 à FP-5, 107 commits, partie de `e40c141`), sur la consigne du relecteur adoptée par Ko, collée en tête de la session (`docs/preuves/D342/consigne.md`). Lot de **CODE par destination** — la fusion apporte le code de quatorze lots — mais **ce lot n'écrit aucune ligne de code neuve** (consigne, § 3) : si une porte exige une correction, c'est un arrêt, pas une réparation. Méthode : les règles de `AGENTS.md`, sans session adverse ni certification (pause de Ko, DR1 de D336 ; R-4 de la consigne pour FP-1).

- **SHA de départ** : `d44867a94f90e9544c5e7fe6b6a56c0c91caea36` (clôture du contrôle de fin de lot de D341). `HEAD` = `origin/main` après `git fetch` (les deux sur ce SHA), arbre propre (`git status --short` : 0 ligne), aucun stash (0 ligne), branche `main`. `origin/front-client` = `43996e279f49bff19792b4e27cfec4bb59b66177`. Base commune : `e40c14150881716448afc0a94334556370641716`. Commits : 107 sur la branche et absents de `main`, 20 sur `main` et absents de la branche, 0 fusion sur la branche.
- **Numéro** : D342 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D341, dernière des 295 lignes `| Dnnn |`) ; `D342` ne figure dans aucun des quatre fichiers d'autorité (compte 0 sur le texte aplati : 0, 0, 0, 0), ni dans `main` ni dans la branche (`git grep -l` : 0 fichier des deux côtés).
- **Poste à l'ouverture** : **sur secteur** (`PowerLineStatus` = `Online`), RAM libre 4 376 Mo sur 16 095, `chrome` 0, `headless_shell` 0, `node` 0, Docker 29.8.0 lancé, conteneur `zwadj-db` « Up » (port 5432 publié). Aucun des ports d'e2e (3100, 3101, 5273, 5274) ni des ports de développement (3000, 4000, 5173) n'est en écoute, relevé par `Get-NetTCPConnection` et recoupé par `netstat -ano` (6 écoutes TCP au total) — ⚠ **ces deux sondes ne voient pas non plus le port 5432 que Docker publie** (0 écoute chacune, alors que le conteneur le publie) : elles ne disent rien des ports relayés par Docker, seulement des serveurs natifs, ce que sont ceux de l'e2e. Sur batterie au moment des portes de clôture : aucune porte ne se lance (R-9 de D340 ; le pilote refuse lui-même, code 3).
- **Ce que la fusion apporte** (mesuré avant d'écrire, `git diff --name-status origin/main...origin/front-client`) : **440 fichiers — 349 ajoutés, 90 modifiés, 1 supprimé** (`apps/client/src/app/[locale]/assistant/page.tsx`) ; 311 sous `docs/preuves/front-client/`, 61 sous `apps/client`, 30 sous `apps/pro`, 4 sous `packages/types`, 3 sous `packages/i18n`, 3 sous `e2e/specs`, 1 sous `e2e/baselines`, 27 sous `neutralisation/`. **0 fichier sous `apps/api`, 0 migration, 0 fichier `.sql`, 0 `package.json` ni `pnpm-lock.yaml`, 0 fichier d'autorité** (`AGENTS.md`, `CLAUDE.md`, `ZWADJ_*` : 0). **Trois fichiers sont modifiés des deux côtés** (`packages/i18n/messages/ar.json`, `packages/i18n/messages/fr.json`, `packages/types/src/index.ts`) : la fusion y passe sans conflit, et seuls les tests disent si le résultat est juste.
- **Essai de fusion, sans rien écrire dans l'arbre** : `git merge-tree --write-tree origin/main origin/front-client` → code de sortie 0, arbre prédit `75fa1e014bfa2dd924d5312199ffb60a945d23bb`. La fusion réelle se fait sur `HEAD` après les commits de pièces de ce lot : son arbre différera donc de celui-ci par les seuls fichiers de `docs/preuves/D342/`, et le contrôle de fin de lot le prouve par un **rejeu** (`git merge-tree --write-tree HEAD^1 HEAD^2` doit rendre l'arbre de la fusion).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; consigne, §§ 3 et 5) : (1) **ce fichier, SEUL** ; (2) la consigne en pièce, la sortie de la lecture adverse de la consigne, l'audit de secrets scellé et son tri, **avant toute écriture d'autorité** ; (3) l'audit de secrets de l'arbre de la fusion d'essai (les 311 fichiers de `docs/preuves/front-client/` compris) et son tri, **avant la fusion** ; (4) **la fusion `--no-ff`** (R-3), jamais un rebase ni un squash ; (5) les pièces des portes de clôture, des campagnes et du contrôle de la fusion ; (6) les trois `.md` d'autorité, **les arbitrages de Ko en PREMIÈRE écriture** (section 1 de la consigne, puis R-1 à R-11 écrites comme décisions du relecteur) ; (7) le contrôle de fin de lot, écrit **après** la poussée (D288). Aucun fichier de code, de test ni de harnais n'est écrit par ce lot : le commit de fusion est le seul qui en apporte, et il n'en apporte que ceux de la liste A.
- **Règle d'arrêt** (consigne, § 0, mot pour mot) : « Si un seul de ces points diffère : tu t'arrêtes, tu le dis, tu n'écris rien. » — les cinq points ont été relevés avant toute écriture (SHA de `main` et de la branche, arbre propre, pas de stash, compteur et rang dans `ZWADJ_CONTINUITE.md`) : aucun ne diffère. **Et** : un rouge hors des fichiers de la branche se rejoue une fois (R-6 de D339, règle écrite avant), un rouge encore ⇒ **aucune poussée**, un rapport ; un rouge dans un fichier de la branche ⇒ aucune correction, le lot fautif est cherché en rejouant le test sur le commit de clôture de chaque lot.
- **Écrit pour ne pas se lire comme tenu** : cette table ne dit pas que la fusion est sans conflit **sémantique** — elle dit qu'elle l'est sans conflit **textuel**. Ce qui le dit pour les trois fichiers modifiés des deux côtés, ce sont les six portes et les campagnes, après la fusion.

## A. Les fichiers que la fusion apporte — 440 chemins COMPLETS

Sortie de `git diff --name-only origin/main...origin/front-client`, **versée telle quelle** (une ligne par chemin, 440 lignes, 20 814 octets, sha256 `6d66dfe7011e1ac76f214089b89061266b25498b8d90d9ac43d8b6cfa73851af`). Aucun préfixe : « 0 fichier non déclaré » doit pouvoir être faux (D328).

```
apps/client/src/app/[locale]/assistant/page.tsx
apps/client/src/app/[locale]/auth/inscription/page.tsx
apps/client/src/app/[locale]/auth/mot-de-passe-oublie/page.tsx
apps/client/src/app/[locale]/auth/reinitialisation/page.tsx
apps/client/src/app/[locale]/auth/verification-email/page.tsx
apps/client/src/app/[locale]/cgu/page.tsx
apps/client/src/app/[locale]/confidentialite/page.tsx
apps/client/src/app/[locale]/not-found.tsx
apps/client/src/app/[locale]/page.test.tsx
apps/client/src/app/[locale]/page.tsx
apps/client/src/app/[locale]/salles/(recherche)/page.tsx
apps/client/src/app/[locale]/salles/[slug]/page.tsx
apps/client/src/app/not-found.tsx
apps/client/src/app/theme-contrast.test.ts
apps/client/src/app/theme.css
apps/client/src/components/account/account-settings-view.tsx
apps/client/src/components/account/visit-bookings-section.tsx
apps/client/src/components/auth/auth-ui.tsx
apps/client/src/components/auth/google-signin.test.tsx
apps/client/src/components/auth/login-form.tsx
apps/client/src/components/auth/recovery-forms.tsx
apps/client/src/components/auth/register-form.tsx
apps/client/src/components/filter-wizard.test.tsx
apps/client/src/components/filter-wizard.tsx
apps/client/src/components/home-view.tsx
apps/client/src/components/search/search-view.test.tsx
apps/client/src/components/search/search-view.tsx
apps/client/src/components/site-chrome.tsx
apps/client/src/components/site-footer.tsx
apps/client/src/components/site-nav.tsx
apps/client/src/components/venue-card.tsx
apps/client/src/components/venue/availability-calendar.tsx
apps/client/src/components/venue/booking-date-picker.test.tsx
apps/client/src/components/venue/booking-date-picker.tsx
apps/client/src/components/venue/booking-request-panel-demande.test.tsx
apps/client/src/components/venue/booking-request-panel-langue.test.tsx
apps/client/src/components/venue/booking-request-panel-montants.test.tsx
apps/client/src/components/venue/booking-request-panel.tsx
apps/client/src/components/venue/venue-detail-view.test.tsx
apps/client/src/components/venue/venue-detail-view.tsx
apps/client/src/components/venue/venue-photos.tsx
apps/client/src/components/venue/visit-booking-panel.tsx
apps/client/src/lib/adresses-guard.test.ts
apps/client/src/lib/booking-calendar.test.ts
apps/client/src/lib/booking-calendar.ts
apps/client/src/lib/calendar.spec.ts
apps/client/src/lib/calendar.ts
apps/client/src/lib/intl-locale-guard.test.ts
apps/client/src/lib/intl-locale.test.ts
apps/client/src/lib/nom-localise.test.ts
apps/client/src/lib/nom-localise.ts
apps/client/src/lib/routes.test.ts
apps/client/src/lib/routes.ts
apps/client/src/lib/search-query.test.ts
apps/client/src/lib/search-query.ts
apps/client/src/lib/semaine-source-unique.test.ts
apps/client/src/lib/seo.test.ts
apps/client/src/lib/seo.ts
apps/client/src/lib/structured-data.test.ts
apps/client/src/test-setup-calibration.test.ts
apps/client/src/test-setup.ts
apps/pro/src/App.tsx
apps/pro/src/account/account-settings-page.tsx
apps/pro/src/auth/auth-ui.tsx
apps/pro/src/auth/login-page.tsx
apps/pro/src/auth/recovery-pages.tsx
apps/pro/src/auth/register-page.tsx
apps/pro/src/dashboard/dashboard-aside.tsx
apps/pro/src/dashboard/walkin-client.ts
apps/pro/src/dashboard/walkin-journey.test.tsx
apps/pro/src/dashboard/walkin-journey.tsx
apps/pro/src/dashboard/walkin-revision.test.ts
apps/pro/src/dashboard/walkin-services.test.ts
apps/pro/src/dashboard/walkin-services.ts
apps/pro/src/routes.test.tsx
apps/pro/src/routes.ts
apps/pro/src/shell/pro-header.tsx
apps/pro/src/shell/pro-nav.tsx
apps/pro/src/shell/venue-scope.tsx
apps/pro/src/theme.css
apps/pro/src/venues/create-venue-page.tsx
apps/pro/src/venues/edit-venue-page.tsx
apps/pro/src/venues/intl-locale-pro.test.ts
apps/pro/src/venues/pricing-rules-editor.tsx
apps/pro/src/venues/pro-calendar.spec.ts
apps/pro/src/venues/pro-calendar.ts
apps/pro/src/venues/quote-amount.test.ts
apps/pro/src/venues/quotes-section.tsx
apps/pro/src/venues/services-section.tsx
apps/pro/src/venues/venue-calendar.tsx
apps/pro/src/venues/venue-list-page.tsx
docs/preuves/front-client/BILAN.md
docs/preuves/front-client/FC-1/audit-secrets-fc1.txt
docs/preuves/front-client/FC-1/campagnes.txt
docs/preuves/front-client/FC-1/controle.txt
docs/preuves/front-client/FC-1/neutralisation/sortie-e2e.txt
docs/preuves/front-client/FC-1/neutralisation/sortie-unitaire.txt
docs/preuves/front-client/FC-1/portes.md
docs/preuves/front-client/FC-1/portes/build.txt
docs/preuves/front-client/FC-1/portes/lint.txt
docs/preuves/front-client/FC-1/portes/resume.txt
docs/preuves/front-client/FC-1/portes/test-e2e.txt
docs/preuves/front-client/FC-1/portes/test-int.txt
docs/preuves/front-client/FC-1/portes/test.txt
docs/preuves/front-client/FC-1/portes/typecheck.txt
docs/preuves/front-client/FC-1/premisse.md
docs/preuves/front-client/FC-1/rapport.md
docs/preuves/front-client/FC-1/rouges/rouge-e2e-b8.txt
docs/preuves/front-client/FC-1/rouges/rouge-unitaire.txt
docs/preuves/front-client/FC-1/table-ouverture.md
docs/preuves/front-client/FC-1/tri-audit-fc1.txt
docs/preuves/front-client/FC-10/ancres-campagnes.txt
docs/preuves/front-client/FC-10/audit-secrets-fc10.txt
docs/preuves/front-client/FC-10/campagnes.txt
docs/preuves/front-client/FC-10/controle.txt
docs/preuves/front-client/FC-10/crlf/available-on.txt
docs/preuves/front-client/FC-10/neutralisation/sortie.txt
docs/preuves/front-client/FC-10/portes/build.txt
docs/preuves/front-client/FC-10/portes/lint.txt
docs/preuves/front-client/FC-10/portes/resume.txt
docs/preuves/front-client/FC-10/portes/test-e2e.txt
docs/preuves/front-client/FC-10/portes/test-int.txt
docs/preuves/front-client/FC-10/portes/test.txt
docs/preuves/front-client/FC-10/portes/typecheck.txt
docs/preuves/front-client/FC-10/rapport.md
docs/preuves/front-client/FC-10/releve-seo.md
docs/preuves/front-client/FC-10/rouges/rouge-client.txt
docs/preuves/front-client/FC-10/rouges/rouge-e2e.txt
docs/preuves/front-client/FC-10/table-ouverture.md
docs/preuves/front-client/FC-10/tri-audit-fc10.txt
docs/preuves/front-client/FC-11/arret.md
docs/preuves/front-client/FC-11/audit-secrets-fc11.txt
docs/preuves/front-client/FC-11/controle.txt
docs/preuves/front-client/FC-11/mesures/A-depart-developpement.txt
docs/preuves/front-client/FC-11/mesures/A-depart-production.txt
docs/preuves/front-client/FC-11/mesures/B-layout-racine-passe-plat.txt
docs/preuves/front-client/FC-11/mesures/C-html-dans-un-layout-racine.txt
docs/preuves/front-client/FC-11/mesures/mesure-404.mjs
docs/preuves/front-client/FC-11/mesures/mini-next-standard.txt
docs/preuves/front-client/FC-11/table-ouverture.md
docs/preuves/front-client/FC-11/tri-audit-fc11.txt
docs/preuves/front-client/FC-12/ancres-campagnes.txt
docs/preuves/front-client/FC-12/arabe-a-relire.md
docs/preuves/front-client/FC-12/audit-secrets-fc12.txt
docs/preuves/front-client/FC-12/campagnes.txt
docs/preuves/front-client/FC-12/controle.txt
docs/preuves/front-client/FC-12/neutralisation/sortie.txt
docs/preuves/front-client/FC-12/portes/act-intermittent.md
docs/preuves/front-client/FC-12/portes/build.txt
docs/preuves/front-client/FC-12/portes/lint.txt
docs/preuves/front-client/FC-12/portes/resume.txt
docs/preuves/front-client/FC-12/portes/test-e2e.txt
docs/preuves/front-client/FC-12/portes/test-int.txt
docs/preuves/front-client/FC-12/portes/test-rejeu.txt
docs/preuves/front-client/FC-12/portes/test.txt
docs/preuves/front-client/FC-12/portes/typecheck.txt
docs/preuves/front-client/FC-12/rapport.md
docs/preuves/front-client/FC-12/rouges/rouge-client-v2.txt
docs/preuves/front-client/FC-12/rouges/rouge-client.txt
docs/preuves/front-client/FC-12/table-ouverture.md
docs/preuves/front-client/FC-12/tri-audit-fc12.txt
docs/preuves/front-client/FC-2/audit-secrets-fc2.txt
docs/preuves/front-client/FC-2/campagnes.txt
docs/preuves/front-client/FC-2/controle.txt
docs/preuves/front-client/FC-2/neutralisation/sortie-e2e.txt
docs/preuves/front-client/FC-2/portes/build.txt
docs/preuves/front-client/FC-2/portes/lint.txt
docs/preuves/front-client/FC-2/portes/resume.txt
docs/preuves/front-client/FC-2/portes/test-e2e.txt
docs/preuves/front-client/FC-2/portes/test-int.txt
docs/preuves/front-client/FC-2/portes/test.txt
docs/preuves/front-client/FC-2/portes/typecheck.txt
docs/preuves/front-client/FC-2/premisse.md
docs/preuves/front-client/FC-2/rapport.md
docs/preuves/front-client/FC-2/rouges/rouge-e2e.txt
docs/preuves/front-client/FC-2/table-ouverture.md
docs/preuves/front-client/FC-2/tri-audit-fc2.txt
docs/preuves/front-client/FC-3/audit-secrets-fc3.txt
docs/preuves/front-client/FC-3/campagnes.txt
docs/preuves/front-client/FC-3/controle.txt
docs/preuves/front-client/FC-3/neutralisation/sortie.txt
docs/preuves/front-client/FC-3/portes/build.txt
docs/preuves/front-client/FC-3/portes/lint.txt
docs/preuves/front-client/FC-3/portes/resume.txt
docs/preuves/front-client/FC-3/portes/test-e2e.txt
docs/preuves/front-client/FC-3/portes/test-int.txt
docs/preuves/front-client/FC-3/portes/test.txt
docs/preuves/front-client/FC-3/portes/typecheck.txt
docs/preuves/front-client/FC-3/premisse.md
docs/preuves/front-client/FC-3/rapport.md
docs/preuves/front-client/FC-3/rouges/rouge-panneau-v2.txt
docs/preuves/front-client/FC-3/rouges/rouge-panneau.txt
docs/preuves/front-client/FC-3/table-ouverture.md
docs/preuves/front-client/FC-3/tri-audit-fc3.txt
docs/preuves/front-client/FC-4/ancres-campagnes.txt
docs/preuves/front-client/FC-4/arabe-a-relire.md
docs/preuves/front-client/FC-4/audit-secrets-fc4.txt
docs/preuves/front-client/FC-4/campagnes.txt
docs/preuves/front-client/FC-4/controle.txt
docs/preuves/front-client/FC-4/neutralisation/sortie.txt
docs/preuves/front-client/FC-4/portes/build.txt
docs/preuves/front-client/FC-4/portes/lint.txt
docs/preuves/front-client/FC-4/portes/resume.txt
docs/preuves/front-client/FC-4/portes/test-e2e.txt
docs/preuves/front-client/FC-4/portes/test-int.txt
docs/preuves/front-client/FC-4/portes/test.txt
docs/preuves/front-client/FC-4/portes/typecheck.txt
docs/preuves/front-client/FC-4/premisse.md
docs/preuves/front-client/FC-4/rapport.md
docs/preuves/front-client/FC-4/rouges/rouge-calendrier.txt
docs/preuves/front-client/FC-4/rouges/rouge-panneau.txt
docs/preuves/front-client/FC-4/table-ouverture.md
docs/preuves/front-client/FC-4/tri-audit-fc4.txt
docs/preuves/front-client/FC-5/ancres-campagnes.txt
docs/preuves/front-client/FC-5/audit-secrets-fc5.txt
docs/preuves/front-client/FC-5/campagnes.txt
docs/preuves/front-client/FC-5/controle.txt
docs/preuves/front-client/FC-5/crlf/404.txt
docs/preuves/front-client/FC-5/crlf/available-on.txt
docs/preuves/front-client/FC-5/crlf/gardes.txt
docs/preuves/front-client/FC-5/crlf/horizon.txt
docs/preuves/front-client/FC-5/crlf/maxprice.txt
docs/preuves/front-client/FC-5/crlf/r30.txt
docs/preuves/front-client/FC-5/neutralisation/sortie.txt
docs/preuves/front-client/FC-5/portes/build.txt
docs/preuves/front-client/FC-5/portes/lint.txt
docs/preuves/front-client/FC-5/portes/resume.txt
docs/preuves/front-client/FC-5/portes/test-e2e.txt
docs/preuves/front-client/FC-5/portes/test-int.txt
docs/preuves/front-client/FC-5/portes/test.txt
docs/preuves/front-client/FC-5/portes/typecheck.txt
docs/preuves/front-client/FC-5/premisse.md
docs/preuves/front-client/FC-5/rapport.md
docs/preuves/front-client/FC-5/rouges/rouge-client-v2.txt
docs/preuves/front-client/FC-5/rouges/rouge-client.txt
docs/preuves/front-client/FC-5/rouges/rouge-pro-v2.txt
docs/preuves/front-client/FC-5/rouges/rouge-pro.txt
docs/preuves/front-client/FC-5/table-ouverture.md
docs/preuves/front-client/FC-5/tri-audit-fc5.txt
docs/preuves/front-client/FC-6/ancres-campagnes.txt
docs/preuves/front-client/FC-6/audit-secrets-fc6.txt
docs/preuves/front-client/FC-6/campagnes.txt
docs/preuves/front-client/FC-6/controle.txt
docs/preuves/front-client/FC-6/crlf/r30.txt
docs/preuves/front-client/FC-6/neutralisation/sortie.txt
docs/preuves/front-client/FC-6/portes/build.txt
docs/preuves/front-client/FC-6/portes/lint.txt
docs/preuves/front-client/FC-6/portes/resume.txt
docs/preuves/front-client/FC-6/portes/test-e2e.txt
docs/preuves/front-client/FC-6/portes/test-int-isole.txt
docs/preuves/front-client/FC-6/portes/test-int.txt
docs/preuves/front-client/FC-6/portes/test.txt
docs/preuves/front-client/FC-6/portes/typecheck.txt
docs/preuves/front-client/FC-6/premisse.md
docs/preuves/front-client/FC-6/rapport.md
docs/preuves/front-client/FC-6/releve-ar-dz.mjs
docs/preuves/front-client/FC-6/releve-ar-dz.txt
docs/preuves/front-client/FC-6/rouges/rouge-client.txt
docs/preuves/front-client/FC-6/rouges/rouge-pro.txt
docs/preuves/front-client/FC-6/table-ouverture.md
docs/preuves/front-client/FC-6/tri-audit-fc6.txt
docs/preuves/front-client/FC-7/ancres-campagnes.txt
docs/preuves/front-client/FC-7/audit-secrets-fc7.txt
docs/preuves/front-client/FC-7/campagnes.txt
docs/preuves/front-client/FC-7/controle.txt
docs/preuves/front-client/FC-7/crlf/available-on.txt
docs/preuves/front-client/FC-7/crlf/maxprice.txt
docs/preuves/front-client/FC-7/neutralisation/sortie.txt
docs/preuves/front-client/FC-7/portes/build.txt
docs/preuves/front-client/FC-7/portes/lint.txt
docs/preuves/front-client/FC-7/portes/resume.txt
docs/preuves/front-client/FC-7/portes/test-e2e.txt
docs/preuves/front-client/FC-7/portes/test-int.txt
docs/preuves/front-client/FC-7/portes/test.txt
docs/preuves/front-client/FC-7/portes/typecheck.txt
docs/preuves/front-client/FC-7/premisse.md
docs/preuves/front-client/FC-7/rapport.md
docs/preuves/front-client/FC-7/rouges/rouge-client-v2.txt
docs/preuves/front-client/FC-7/rouges/rouge-client.txt
docs/preuves/front-client/FC-7/table-ouverture.md
docs/preuves/front-client/FC-7/tri-audit-fc7.txt
docs/preuves/front-client/FC-8/ancres-campagnes.txt
docs/preuves/front-client/FC-8/arabe-a-relire.md
docs/preuves/front-client/FC-8/audit-secrets-fc8.txt
docs/preuves/front-client/FC-8/campagnes.txt
docs/preuves/front-client/FC-8/controle.txt
docs/preuves/front-client/FC-8/crlf/available-on.txt
docs/preuves/front-client/FC-8/crlf/horizon.txt
docs/preuves/front-client/FC-8/e3d1-s8.txt
docs/preuves/front-client/FC-8/neutralisation/sortie.txt
docs/preuves/front-client/FC-8/portes/build.txt
docs/preuves/front-client/FC-8/portes/lint.txt
docs/preuves/front-client/FC-8/portes/resume.txt
docs/preuves/front-client/FC-8/portes/test-e2e.txt
docs/preuves/front-client/FC-8/portes/test-int.txt
docs/preuves/front-client/FC-8/portes/test.txt
docs/preuves/front-client/FC-8/portes/typecheck.txt
docs/preuves/front-client/FC-8/premisse.md
docs/preuves/front-client/FC-8/r32.txt
docs/preuves/front-client/FC-8/rapport.md
docs/preuves/front-client/FC-8/rouges/rouge-client-v2.txt
docs/preuves/front-client/FC-8/rouges/rouge-client-v3.txt
docs/preuves/front-client/FC-8/rouges/rouge-client.txt
docs/preuves/front-client/FC-8/rouges/rouge-e2e-v2.txt
docs/preuves/front-client/FC-8/rouges/rouge-e2e.txt
docs/preuves/front-client/FC-8/table-ouverture.md
docs/preuves/front-client/FC-8/tri-audit-fc8.txt
docs/preuves/front-client/FC-9/ancres-campagnes.txt
docs/preuves/front-client/FC-9/audit-secrets-fc9.txt
docs/preuves/front-client/FC-9/campagnes.txt
docs/preuves/front-client/FC-9/controle.txt
docs/preuves/front-client/FC-9/e3d1-s8.txt
docs/preuves/front-client/FC-9/neutralisation/sortie.txt
docs/preuves/front-client/FC-9/portes/build.txt
docs/preuves/front-client/FC-9/portes/lint.txt
docs/preuves/front-client/FC-9/portes/resume.txt
docs/preuves/front-client/FC-9/portes/test-e2e.txt
docs/preuves/front-client/FC-9/portes/test-int.txt
docs/preuves/front-client/FC-9/portes/test.txt
docs/preuves/front-client/FC-9/portes/typecheck.txt
docs/preuves/front-client/FC-9/rapport.md
docs/preuves/front-client/FC-9/releve.md
docs/preuves/front-client/FC-9/releve/passe-1.txt
docs/preuves/front-client/FC-9/releve/passe-2.txt
docs/preuves/front-client/FC-9/releve/passe-3.txt
docs/preuves/front-client/FC-9/rouges/rouge-client.txt
docs/preuves/front-client/FC-9/table-ouverture.md
docs/preuves/front-client/FC-9/tri-audit-fc9.txt
docs/preuves/front-client/FP-1/ancres-campagnes.txt
docs/preuves/front-client/FP-1/arabe-a-relire.md
docs/preuves/front-client/FP-1/audit-secrets-fp1.txt
docs/preuves/front-client/FP-1/campagnes.txt
docs/preuves/front-client/FP-1/controle.txt
docs/preuves/front-client/FP-1/modes-de-defaillance.md
docs/preuves/front-client/FP-1/neutralisation/sortie.txt
docs/preuves/front-client/FP-1/portes/build.txt
docs/preuves/front-client/FP-1/portes/lint.txt
docs/preuves/front-client/FP-1/portes/resume.txt
docs/preuves/front-client/FP-1/portes/test-e2e.txt
docs/preuves/front-client/FP-1/portes/test-int.txt
docs/preuves/front-client/FP-1/portes/test.txt
docs/preuves/front-client/FP-1/portes/typecheck.txt
docs/preuves/front-client/FP-1/rapport.md
docs/preuves/front-client/FP-1/rouges/rouge-pro-v2.txt
docs/preuves/front-client/FP-1/rouges/rouge-pro.txt
docs/preuves/front-client/FP-1/table-ouverture.md
docs/preuves/front-client/FP-1/tri-audit-fp1.txt
docs/preuves/front-client/FP-2/ancres-campagnes.txt
docs/preuves/front-client/FP-2/audit-secrets-fp2.txt
docs/preuves/front-client/FP-2/campagnes.txt
docs/preuves/front-client/FP-2/controle.txt
docs/preuves/front-client/FP-2/neutralisation/sortie.txt
docs/preuves/front-client/FP-2/portes/build.txt
docs/preuves/front-client/FP-2/portes/lint.txt
docs/preuves/front-client/FP-2/portes/resume.txt
docs/preuves/front-client/FP-2/portes/test-e2e.txt
docs/preuves/front-client/FP-2/portes/test-int.txt
docs/preuves/front-client/FP-2/portes/test.txt
docs/preuves/front-client/FP-2/portes/typecheck.txt
docs/preuves/front-client/FP-2/rapport.md
docs/preuves/front-client/FP-2/rouges/rouge-pro-v2.txt
docs/preuves/front-client/FP-2/rouges/rouge-pro.txt
docs/preuves/front-client/FP-2/table-ouverture.md
docs/preuves/front-client/FP-2/tri-audit-fp2.txt
docs/preuves/front-client/FP-3/ancres-campagnes.txt
docs/preuves/front-client/FP-3/audit-secrets-fp3.txt
docs/preuves/front-client/FP-3/campagnes.txt
docs/preuves/front-client/FP-3/controle.txt
docs/preuves/front-client/FP-3/neutralisation/sortie.txt
docs/preuves/front-client/FP-3/portes/build.txt
docs/preuves/front-client/FP-3/portes/lint.txt
docs/preuves/front-client/FP-3/portes/resume.txt
docs/preuves/front-client/FP-3/portes/test-e2e.txt
docs/preuves/front-client/FP-3/portes/test-int.txt
docs/preuves/front-client/FP-3/portes/test.txt
docs/preuves/front-client/FP-3/portes/typecheck.txt
docs/preuves/front-client/FP-3/rapport.md
docs/preuves/front-client/FP-3/rouges/rouge-pro-v2.txt
docs/preuves/front-client/FP-3/rouges/rouge-pro.txt
docs/preuves/front-client/FP-3/table-ouverture.md
docs/preuves/front-client/FP-3/tri-audit-fp3.txt
docs/preuves/front-client/FP-4/arret.md
docs/preuves/front-client/FP-4/audit-secrets-fp4.txt
docs/preuves/front-client/FP-4/controle.txt
docs/preuves/front-client/FP-4/table-ouverture.md
docs/preuves/front-client/FP-4/tri-audit-fp4.txt
docs/preuves/front-client/FP-5/arret.md
docs/preuves/front-client/FP-5/audit-secrets-fp5.txt
docs/preuves/front-client/FP-5/controle.txt
docs/preuves/front-client/FP-5/table-ouverture.md
docs/preuves/front-client/FP-5/tri-audit-fp5.txt
docs/preuves/front-client/audit-secrets-ouverture.txt
docs/preuves/front-client/consigne.md
docs/preuves/front-client/etat-entree-e2e-extrait.txt
docs/preuves/front-client/etat-entree-e2e.md
docs/preuves/front-client/etat-entree.md
docs/preuves/front-client/lecture-adverse.txt
docs/preuves/front-client/outils/controle-lot.py
docs/preuves/front-client/outils/crlf-simule.py
docs/preuves/front-client/outils/portes.sh
docs/preuves/front-client/outils/releve-ancres.py
docs/preuves/front-client/tri-audit-ouverture.txt
e2e/baselines/a11y.json
e2e/specs/fc10-donnees-structurees.e2e.ts
e2e/specs/fc2-debordement-360.e2e.ts
e2e/specs/fc8-mode-guide.e2e.ts
neutralisation/neutralize-404.py
neutralisation/neutralize-act-plafonds.py
neutralisation/neutralize-available-on.py
neutralisation/neutralize-e3d1-s8.py
neutralisation/neutralize-fc1.py
neutralisation/neutralize-fc10.py
neutralisation/neutralize-fc12.py
neutralisation/neutralize-fc2.py
neutralisation/neutralize-fc3.py
neutralisation/neutralize-fc4.py
neutralisation/neutralize-fc5.py
neutralisation/neutralize-fc6.py
neutralisation/neutralize-fc7.py
neutralisation/neutralize-fc8.py
neutralisation/neutralize-fc9.py
neutralisation/neutralize-fp1.py
neutralisation/neutralize-fp2.py
neutralisation/neutralize-fp3.py
neutralisation/neutralize-horloge.py
neutralisation/neutralize-maxprice.py
neutralisation/neutralize-r29.py
neutralisation/neutralize-r30.py
neutralisation/neutralize-r37.py
neutralisation/neutralize-r41.py
neutralisation/neutralize-r43.py
neutralisation/neutralize-solid-s7.py
neutralisation/socle_front_client.py
packages/i18n/messages/ar.json
packages/i18n/messages/fr.json
packages/i18n/src/format.ts
packages/types/src/index.ts
packages/types/src/intl-locale.ts
packages/types/src/money.ts
packages/types/src/week.ts
```

⚠ **Fichier de cette liste que ce lot modifie ensuite, par AJOUT SEUL** (R-4 de la consigne) : `docs/preuves/front-client/BILAN.md` — une annotation, sans retouche du texte existant.

## B. Les pièces de D342 — chemins complets

Toutes sous `docs/preuves/D342/`. Les journaux de campagne, dont le nombre dépend de la liste calculée, sont déclarés par extension.

| chemin | rôle |
|---|---|
| `docs/preuves/D342/table-ouverture.md` | ce fichier — premier commit du lot, SEUL |
| `docs/preuves/D342/consigne.md` | la consigne du relecteur, versée telle quelle (la copie du message collé) |
| `docs/preuves/D342/lecture-adverse/confronter-consigne.py` | l'instrument de la lecture adverse de la consigne contre le dépôt, calibré sur deux bras |
| `docs/preuves/D342/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D342/audit-secrets-d342a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la consigne et de la lecture adverse |
| `docs/preuves/D342/tri-audit-d342a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D341/audit-secrets-d341f.txt`) |
| `docs/preuves/D342/fusion/essai-fusion.txt` | l'essai de fusion sans écriture : l'arbre prédit, le code de sortie, les 440 fichiers, les trois fichiers modifiés des deux côtés |
| `docs/preuves/D342/audit-secrets-d342b.txt` | audit de secrets scellé de l'ARBRE DE LA FUSION D'ESSAI (copie de travail hors dépôt), avant la fusion : il couvre les 311 fichiers de `docs/preuves/front-client/` |
| `docs/preuves/D342/tri-audit-d342b.txt` | son tri différentiel contre `audit-secrets-d342a.txt` |
| `docs/preuves/D342/fusion/controle-fusion.py` | le contrôle de la fusion : `--no-ff`, deux parents, arbre rejoué, les 18 SHA du BILAN ancêtres, diff = liste A |
| `docs/preuves/D342/fusion/controle-fusion.txt` | sa sortie |
| `docs/preuves/D342/portes/_index.txt` | l'index de la passe sur secteur (`docs/preuves/D340/portes/passe-secteur.sh`, employé tel quel) |
| `docs/preuves/D342/portes/typecheck.txt`, `lint.txt`, `test.txt`, `build.txt`, `test-int.txt` | les cinq sorties de porte, sans codes ANSI |
| `docs/preuves/D342/portes/test-e2e.txt` | la sortie de l'e2e — pièce MASQUÉE (le dépôt est public, D200) |
| `docs/preuves/D342/portes/masquer-jetons.py` | la procédure qui a masqué les jetons de la sortie e2e, archivée à côté de la pièce (jamais promue en instrument, D291) |
| `docs/preuves/D342/portes/etat-machine-pendant.txt` | l'état machine relevé toutes les 30 s pendant la passe |
| `docs/preuves/D342/portes/FIN` | le marqueur de fin de passe écrit par le pilote |
| `docs/preuves/D342/audit-secrets-d342c.txt` | audit de secrets scellé, AVANT le commit des pièces de portes |
| `docs/preuves/D342/tri-audit-d342c.txt` | son tri différentiel contre `audit-secrets-d342b.txt` |
| `docs/preuves/D342/neutralisation/calculer-union.py` | calcule l'union des campagnes concernées par le diff de la fusion (`HEAD^1..HEAD`) — copie de celui de D341, base changée, déclarée dans son en-tête |
| `docs/preuves/D342/neutralisation/jouer-union.py` | joue l'union EN SÉRIE — copie de celui de D341, chemins et liste des campagnes `--int` relevés, déclarés dans son en-tête |
| `docs/preuves/D342/neutralisation/calculer-complement.py` | calcule le COMPLÉMENT : les campagnes que le tri ne voit pas parce qu'elles écrivent un chemin RELATIF à `apps/client` ou `apps/pro` |
| `docs/preuves/D342/neutralisation/union-sortie.txt` | la liste calculée et versée AVANT de jouer |
| `docs/preuves/D342/neutralisation/union-rapport.txt` | le tableau final de la passe de l'union |
| `docs/preuves/D342/scenarios-ko.md` | les gestes de Ko (§ 4 de la consigne), dix lignes au plus, **non joués par la session** |
| `docs/preuves/D342/passe-d277/passe-d277.py` | la passe D277 des deux sens, motifs dérivés des affirmations du lot |
| `docs/preuves/D342/passe-d277/sortie-avant.txt`, `docs/preuves/D342/passe-d277/sortie-apres.txt` | ses sorties, avant et après les écritures d'autorité |
| `docs/preuves/D342/aucune-valeur-reelle.txt` | la sortie du contrôle dédié « 0 valeur réelle sur N fichiers » (D299) |
| `docs/preuves/D342/audit-secrets-d342d.txt` | audit de secrets scellé, AVANT le commit des campagnes et des gestes de Ko |
| `docs/preuves/D342/tri-audit-d342d.txt` | son tri différentiel contre `audit-secrets-d342c.txt` |
| `docs/preuves/D342/audit-secrets-d342e.txt` | audit de secrets scellé de la clôture, AVANT les `.md` d'autorité |
| `docs/preuves/D342/tri-audit-d342e.txt` | son tri différentiel contre `audit-secrets-d342d.txt` |
| `docs/preuves/D342/controle-fin-de-lot.py` | le contrôle de fin de lot (D288, D328), écrit APRÈS la poussée |
| `docs/preuves/D342/controle-fin-de-lot.txt` | sa sortie |

### Pièces CONDITIONNELLES (leur existence dépend d'un défaut ou d'un cas — D328)

| chemin | condition |
|---|---|
| `docs/preuves/D342/lecture-adverse/defauts-instrument.txt` | si la première passe de l'instrument de lecture adverse montre un défaut d'instrument (D341) |
| `docs/preuves/D342/portes/rejeu-*.txt`, `docs/preuves/D342/portes/rejeu-etat-machine.txt` (chemins complets par extension) | si une porte rend un rouge HORS des fichiers de la branche : un seul rejeu, la règle écrite avant (R-6 de D339) |
| `docs/preuves/D342/portes/lot-fautif/` (chemins complets par extension) | si une porte rend un rouge DANS un fichier de la branche : le test rejoué sur le commit de clôture de chaque lot |
| `docs/preuves/D342/neutralisation/` — les journaux de campagnes (chemins complets par extension) | les campagnes que le tri retient et le complément : leur liste dépend du diff de la fusion |
| `docs/preuves/D342/passe-d277/` — outils de lecture supplémentaires (chemins complets par extension) | si un compte de motifs ne suffit pas à trier (D341, extension 3) |
| `docs/preuves/D342/audit-secrets-d342f.txt`, `docs/preuves/D342/tri-audit-d342f.txt` | si un versement a lieu après `audit-secrets-d342e.txt` |

## C. Les fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

| chemin | ce que le lot y écrit |
|---|---|
| `ZWADJ_CONTINUITE.md` | **première écriture** : la section 1 de la consigne (a, b, c, d — par adoption, jamais comme une parole de Ko hors la citation de c) et les décisions du relecteur R-1 à R-11, écrites comme telles, la table recopiée à l'identique ; puis, EN DERNIER, la section D342 (les dix-sept lots, leur état, leurs SHA de départ et de clôture, leurs décisions prises seul RATIFIÉES par adoption), l'ordre des rangs (« RANG 45 : CLOS », puis « RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR »), le registre (D342), le point d'entrée, la passe D277 |
| `ZWADJ_BACKLOG.md` | les entrées neuves de R-9 et R-8 (forme D302 : ce qu'elles bloquent, leur coût, aucune durée), les entrées que la branche a traitées COCHÉES avec le renvoi au lot, les prémisses fausses de R-7 BARRÉES avec leur motif |
| `AGENTS.md` | le compteur POUR MÉMOIRE (QUATRE → DIX-HUIT, R-5), l'exception de la session cloud CONSOMMÉE (1 b), les annotations de ce qui est devenu faux ou permis — annotées, pas réécrites |

## D. Ce que cette table NE déclare PAS (et pourquoi)

- **Aucun fichier de code, de test, de harnais, de migration ni de dépendance n'est écrit par ce lot.** Si le diff final en contient un hors de la liste A, c'est un incident, pas une omission.
- **`CLAUDE.md`** n'est pas déclaré : la consigne nomme trois fichiers d'autorité, et l'exception de la session cloud (« un lot par session », `CLAUDE.md`) se consigne dans les trois.
- **`neutralisation/lancer-campagnes.py` et les autres instruments de `neutralisation/`** ne sont pas retouchés (R-10) : leur promotion est un autre lot.
- **Le sort de la branche `front-client`** : elle n'est pas supprimée dans cette session (consigne, § 5).
- **Les gestes de Ko** (consigne, § 4) : la session écrit `scenarios-ko.md`, elle ne les joue pas, et n'écrit rien sur la base de développement de Ko (la migration `20261104170000_staff_layer` de D341 n'y est pas appliquée : c'est le geste 0, une écriture de Ko).

- **Le diff final** (`git diff d44867a94f90e9544c5e7fe6b6a56c0c91caea36..HEAD --name-only`) doit rester inclus dans cette table, extensions comprises ; un fichier hors table est un incident.

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, **AVANT** le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*
