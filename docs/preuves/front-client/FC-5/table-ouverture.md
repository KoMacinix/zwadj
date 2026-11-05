# FC-5 — SOURCE UNIQUE (sans les calendriers) — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `e537bb1511ee7986b6aa5a0be2d8d652a104119d` (dernier commit de FC-4, poussé). Méthode : NORMALE (constantes et liens ; aucun comportement
ne change : chaque constante vaut l'adresse qu'elle remplace). Les DEUX CALENDRIERS de la fiche salle : HORS lot (décision de Ko).
Ordre des commits : (1) cette table seule ; (2) les ROUGES — les quatre gardes, lues contre l'état d'avant, empreintes sha256 ;
(3) le code ; (4) le harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-5/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-5/premisse.md` | la prémisse vérifiée à ce SHA (D231) : les deux déclarations de la semaine, les adresses en dur relevées par l'instrument de D321 rejoué | 2 |
| 3 | `apps/client/src/lib/semaine-source-unique.test.ts` | NEUF — garde : la semaine est déclarée UNE fois (`@zwadj/types`), les deux calendriers l'importent | 2 |
| 4 | `apps/client/src/lib/adresses-guard.test.ts` | NEUF — garde : aucune adresse de page hors des deux tables de routes ; le pro lie aux pages du client par des constantes qui les nomment | 2 |
| 5 | `apps/client/src/lib/routes.test.ts` | garde : chaque constante du client désigne un `page.tsx`, chaque page a sa constante | 2 |
| 6 | `apps/pro/src/routes.test.tsx` | garde : chaque constante du pro est une route DÉCLARÉE (patron de D322) | 2 |
| 7 | `docs/preuves/front-client/FC-5/rouges/rouge-client.txt` | sortie des trois gardes du client contre l'état d'avant + sha256 | 2 |
| 8 | `docs/preuves/front-client/FC-5/rouges/rouge-pro.txt` | sortie de la garde du pro contre l'état d'avant + sha256 | 2 |
| 9 | `packages/types/src/week.ts` | NEUF — LA semaine algérienne (D56) : `WEEK_START_DAY`, `WEEKEND_DAYS` | 3 |
| 10 | `packages/types/src/index.ts` | l'exporte | 3 |
| 11 | `apps/client/src/lib/calendar.ts` | importe la semaine au lieu de la déclarer | 3 |
| 12 | `apps/pro/src/venues/pro-calendar.ts` | importe la semaine au lieu de la déclarer | 3 |
| 13 | `apps/client/src/lib/calendar.spec.ts` | se confronte à l'autorité commune | 3 |
| 14 | `apps/pro/src/venues/pro-calendar.spec.ts` | se confronte à l'autorité commune | 3 |
| 15 | `apps/client/src/components/venue/booking-date-picker.test.tsx` | lit le week-end dans l'autorité commune | 3 |
| 16 | `apps/client/src/lib/routes.ts` | la table du client : une constante par page | 3 |
| 17 | `apps/pro/src/routes.ts` | la table du pro : une constante par route | 3 |
| 18 | `apps/client/src/app/[locale]/assistant/page.tsx` | une adresse en dur → sa constante | 3 |
| 19 | `apps/client/src/app/[locale]/auth/inscription/page.tsx` | une adresse en dur → sa constante | 3 |
| 20 | `apps/client/src/app/[locale]/auth/mot-de-passe-oublie/page.tsx` | une adresse en dur → sa constante | 3 |
| 21 | `apps/client/src/app/[locale]/auth/reinitialisation/page.tsx` | une adresse en dur → sa constante | 3 |
| 22 | `apps/client/src/app/[locale]/auth/verification-email/page.tsx` | une adresse en dur → sa constante | 3 |
| 23 | `apps/client/src/app/[locale]/cgu/page.tsx` | une adresse en dur → sa constante | 3 |
| 24 | `apps/client/src/app/[locale]/confidentialite/page.tsx` | une adresse en dur → sa constante | 3 |
| 25 | `apps/client/src/app/[locale]/not-found.tsx` | une adresse en dur → sa constante | 3 |
| 26 | `apps/client/src/app/[locale]/salles/(recherche)/page.tsx` | une adresse en dur → sa constante | 3 |
| 27 | `apps/client/src/app/[locale]/salles/[slug]/page.tsx` | une adresse en dur → sa constante | 3 |
| 28 | `apps/client/src/app/not-found.tsx` | une adresse en dur → sa constante | 3 |
| 29 | `apps/client/src/components/account/visit-bookings-section.tsx` | une adresse en dur → sa constante | 3 |
| 30 | `apps/client/src/components/auth/auth-ui.tsx` | une adresse en dur → sa constante | 3 |
| 31 | `apps/client/src/components/auth/login-form.tsx` | une adresse en dur → sa constante | 3 |
| 32 | `apps/client/src/components/auth/recovery-forms.tsx` | une adresse en dur → sa constante | 3 |
| 33 | `apps/client/src/components/auth/register-form.tsx` | une adresse en dur → sa constante | 3 |
| 34 | `apps/client/src/components/filter-wizard.tsx` | une adresse en dur → sa constante | 3 |
| 35 | `apps/client/src/components/home-view.tsx` | une adresse en dur → sa constante | 3 |
| 36 | `apps/client/src/components/search/search-view.tsx` | une adresse en dur → sa constante | 3 |
| 37 | `apps/client/src/components/site-chrome.tsx` | une adresse en dur → sa constante | 3 |
| 38 | `apps/client/src/components/site-footer.tsx` | une adresse en dur → sa constante | 3 |
| 39 | `apps/client/src/components/site-nav.tsx` | une adresse en dur → sa constante | 3 |
| 40 | `apps/client/src/components/venue-card.tsx` | une adresse en dur → sa constante | 3 |
| 41 | `apps/client/src/components/venue/booking-request-panel.tsx` | une adresse en dur → sa constante | 3 |
| 42 | `apps/client/src/components/venue/venue-detail-view.tsx` | une adresse en dur → sa constante | 3 |
| 43 | `apps/client/src/components/venue/visit-booking-panel.tsx` | une adresse en dur → sa constante | 3 |
| 44 | `apps/pro/src/App.tsx` | une adresse en dur → sa constante | 3 |
| 45 | `apps/pro/src/auth/auth-ui.tsx` | une adresse en dur → sa constante | 3 |
| 46 | `apps/pro/src/auth/login-page.tsx` | une adresse en dur → sa constante | 3 |
| 47 | `apps/pro/src/auth/recovery-pages.tsx` | une adresse en dur → sa constante | 3 |
| 48 | `apps/pro/src/auth/register-page.tsx` | une adresse en dur → sa constante | 3 |
| 49 | `apps/pro/src/dashboard/dashboard-aside.tsx` | une adresse en dur → sa constante | 3 |
| 50 | `apps/pro/src/shell/pro-header.tsx` | une adresse en dur → sa constante | 3 |
| 51 | `apps/pro/src/shell/pro-nav.tsx` | une adresse en dur → sa constante | 3 |
| 52 | `apps/pro/src/shell/venue-scope.tsx` | une adresse en dur → sa constante | 3 |
| 53 | `apps/pro/src/venues/create-venue-page.tsx` | une adresse en dur → sa constante | 3 |
| 54 | `apps/pro/src/venues/edit-venue-page.tsx` | une adresse en dur → sa constante | 3 |
| 55 | `apps/pro/src/venues/venue-list-page.tsx` | une adresse en dur → sa constante | 3 |
| 56 | `neutralisation/neutralize-fc5.py` | NEUF — le harnais du lot | 4 |
| 57 | `docs/preuves/front-client/FC-5/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 58 | `docs/preuves/front-client/FC-5/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 59 | `docs/preuves/front-client/FC-5/portes/typecheck.txt` | journal de porte | 4 |
| 60 | `docs/preuves/front-client/FC-5/portes/lint.txt` | journal de porte | 4 |
| 61 | `docs/preuves/front-client/FC-5/portes/test.txt` | journal de porte | 4 |
| 62 | `docs/preuves/front-client/FC-5/portes/build.txt` | journal de porte | 4 |
| 63 | `docs/preuves/front-client/FC-5/portes/test-int.txt` | journal de porte | 4 |
| 64 | `docs/preuves/front-client/FC-5/portes/test-e2e.txt` | journal de porte | 4 |
| 65 | `docs/preuves/front-client/FC-5/portes/resume.txt` | journal de porte | 4 |
| 66 | `docs/preuves/front-client/FC-5/audit-secrets-fc5.txt` | audit de secrets scellé | 4 |
| 67 | `docs/preuves/front-client/FC-5/tri-audit-fc5.txt` | son tri | 4 |
| 68 | `docs/preuves/front-client/FC-5/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 69 | `docs/preuves/front-client/FC-5/rapport.md` | le rapport du lot | 4 |

Conditionnels : un harnais d'un autre rang dont une ANCRE serait périmée par ce lot (le tri des campagnes le dira) — déclaré
par une extension, commitée seule, avant sa réorientation. Aucune chaîne visible n'est ajoutée ⇒ aucune clé arabe à relire.
