# FC-6 — LES DATES ET LES NOMBRES EN ARABE EN `ar-DZ` — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `b595bde2bfb13c7a60e0a09cd32563990a72e779` (dernier commit de FC-5, poussé). Méthode : NORMALE, avec la règle des montants de D325 (le montant affiché
vient du serveur, jamais recalculé ; un test le prouve). Arbitrage de Ko du 04/10/2026, mot pour mot : « Les dates et les nombres en
arabe se formatent en ar-DZ. Le catalogue et les routes restent ar. Le lot qui le fera relèvera d'abord, dans le navigateur, ce que
ar et ar-DZ affichent pour un mois, une date et un prix. »
Ordre des commits : (1) cette table seule ; (2) le RELEVÉ NAVIGATEUR (l'outil et sa sortie), la prémisse, et les ROUGES — lus
contre l'état d'avant, empreintes sha256 ; (3) le code ; (4) le harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-6/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-6/releve-ar-dz.mjs` | l'OUTIL du relevé navigateur (Chromium du conteneur), calibré à deux bras | 2 |
| 3 | `docs/preuves/front-client/FC-6/releve-ar-dz.txt` | sa sortie : `ar`, `ar-DZ`, `fr`, `fr-DZ` pour chaque format de date des deux applications, un prix, un nombre, une note, la semaine CLDR | 2 |
| 4 | `docs/preuves/front-client/FC-6/premisse.md` | la prémisse vérifiée au SHA de départ (D231) : chaque appel, sa langue, et la rencontre avec D326 | 2 |
| 5 | `apps/client/src/lib/intl-locale-guard.test.ts` | NEUF — garde de SOURCE universelle : la langue passe à chaque formateur, une seule règle, un fuseau explicite, aucun `toLocale…String` | 2 |
| 6 | `apps/client/src/lib/intl-locale.test.ts` | NEUF — la règle `intlLocale`, et les dates du client en arabe : celles de l'Algérie | 2 |
| 7 | `apps/client/src/components/venue/booking-request-panel-montants.test.tsx` | NEUF — page arabe : les montants du serveur en `ar-DZ` ; page française inchangée | 2 |
| 8 | `apps/client/src/components/venue/booking-date-picker.test.tsx` | ses attendus tirés d'`Intl` suivent la locale ARBITRÉE (`ar-DZ`) ; la liste des noms interdits en dur compte aussi `ar-DZ` | 2 |
| 9 | `apps/pro/src/venues/quote-amount.test.ts` | NEUF — les montants d'un DEVIS s'affichent comme le PDF les imprime (D326, décision 1), confrontés à la source du PDF | 2 |
| 10 | `apps/pro/src/venues/intl-locale-pro.test.ts` | NEUF — les dates du pro en arabe : celles de l'Algérie (consommateur pro de la règle partagée) | 2 |
| 11 | `apps/pro/src/dashboard/walkin-journey.test.tsx` | son attendu de date longue en arabe suit la locale ARBITRÉE (`ar-DZ`) | 2 |
| 12 | `docs/preuves/front-client/FC-6/rouges/rouge-client.txt` | sortie des tests du client contre l'état d'avant + sha256 | 2 |
| 13 | `docs/preuves/front-client/FC-6/rouges/rouge-pro.txt` | sortie des tests du pro contre l'état d'avant + sha256 | 2 |
| 14 | `packages/types/src/intl-locale.ts` | NEUF — LA règle (`intlLocale`), le fuseau d'Alger (`ALGIERS_TIME_ZONE`), la date d'un instant (`formatInstantDate`) | 3 |
| 15 | `packages/types/src/index.ts` | l'exporte | 3 |
| 16 | `packages/types/src/money.ts` | `formatDZD` suit la règle ; `QUOTE_AMOUNT_LOCALE`, la langue des montants d'un devis (D326) | 3 |
| 17 | `packages/i18n/src/format.ts` | `formatRating` suit la règle | 3 |
| 18 | `apps/client/src/components/venue/availability-calendar.tsx` | son prix suit la règle | 3 |
| 19 | `apps/client/src/lib/booking-calendar.ts` | numéro du jour, date longue : la règle | 3 |
| 20 | `apps/client/src/lib/calendar.ts` | en-têtes de jours, mois : la règle | 3 |
| 21 | `apps/client/src/components/account/account-settings-view.tsx` | la date d'une demande de suppression : langue de la page, fuseau d'Alger | 3 |
| 22 | `apps/client/src/components/venue/booking-request-panel.tsx` | ses montants dans la langue de la page | 3 |
| 23 | `apps/client/src/components/venue/venue-detail-view.tsx` | le prix de base dans la langue de la page | 3 |
| 24 | `apps/pro/src/venues/pricing-rules-editor.tsx` | noms de mois et de jours : la règle | 3 |
| 25 | `apps/pro/src/venues/pro-calendar.ts` | en-têtes de jours, mois : la règle | 3 |
| 26 | `apps/pro/src/dashboard/walkin-journey.tsx` | la date du devis : la règle ; ses montants : `QUOTE_AMOUNT_LOCALE` | 3 |
| 27 | `apps/pro/src/venues/quotes-section.tsx` | les montants d'un devis : `QUOTE_AMOUNT_LOCALE` | 3 |
| 28 | `apps/pro/src/venues/services-section.tsx` | les prix du catalogue dans la langue de la page | 3 |
| 29 | `apps/pro/src/venues/venue-calendar.tsx` | le prix d'un créneau dans la langue de la page | 3 |
| 30 | `apps/pro/src/account/account-settings-page.tsx` | la date d'une demande de suppression : langue de la page, fuseau d'Alger | 3 |
| 31 | `neutralisation/neutralize-fc6.py` | NEUF — le harnais du lot | 4 |
| 32 | `docs/preuves/front-client/FC-6/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 33 | `docs/preuves/front-client/FC-6/ancres-campagnes.txt` | le relevé statique des ancres des campagnes concernées (`releve-ancres.py`) | 4 |
| 34 | `docs/preuves/front-client/FC-6/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 35 | `docs/preuves/front-client/FC-6/portes/typecheck.txt` | journal de porte | 4 |
| 36 | `docs/preuves/front-client/FC-6/portes/lint.txt` | journal de porte | 4 |
| 37 | `docs/preuves/front-client/FC-6/portes/test.txt` | journal de porte | 4 |
| 38 | `docs/preuves/front-client/FC-6/portes/build.txt` | journal de porte | 4 |
| 39 | `docs/preuves/front-client/FC-6/portes/test-int.txt` | journal de porte | 4 |
| 40 | `docs/preuves/front-client/FC-6/portes/test-e2e.txt` | journal de porte | 4 |
| 41 | `docs/preuves/front-client/FC-6/portes/resume.txt` | journal de porte | 4 |
| 42 | `docs/preuves/front-client/FC-6/audit-secrets-fc6.txt` | audit de secrets scellé | 4 |
| 43 | `docs/preuves/front-client/FC-6/tri-audit-fc6.txt` | son tri | 4 |
| 44 | `docs/preuves/front-client/FC-6/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 45 | `docs/preuves/front-client/FC-6/rapport.md` | le rapport du lot | 4 |

Conditionnels, avec leur condition :
- `docs/preuves/front-client/FC-6/crlf/r30.txt` — `neutralize-r30.py` joué sous CRLF simulé (`crlf-simule.py`), SI le tri des
  campagnes le sélectionne (ce lot touche `calendar.ts` et `booking-calendar.ts`, qu'il lit) : son ancre R30-4 est en CRLF en dur, et
  dans ce conteneur la campagne s'arrête avant toute cible.
- un harnais d'un autre rang dont une ANCRE serait périmée par ce lot (le relevé le dira) — déclaré par une extension, commitée
  seule, avant sa réorientation ; et sa sortie sous CRLF simulé s'il en porte.
Aucune chaîne visible n'est ajoutée ⇒ aucune clé arabe à relire.

⛔ CE QUE CE LOT NE FAIT PAS, écrit avant tout code : les montants d'un DEVIS (écran du pro ET PDF) restent au format français —
D326, décision 1 (le PDF imprime comme l'écran) rencontre l'arbitrage de Ko, et le PDF est dans `apps/api`, hors de la session :
ARRÊTÉ pour cette partie, décision due à Ko. Le PDF garde aussi sa propre écriture de la règle pour ses dates (hors session).

## Extension 1 — commitée SEULE, avant les fichiers qu'elle déclare (le conditionnel de la table s'est réalisé)

| # | fichier | rôle | commit |
|---|---|---|---|
| 46 | `neutralisation/neutralize-fc5.py` | W-1, W-2 RÉORIENTÉES : l'import de la semaine porte aussi `intlLocale` (même faute : la semaine redéclarée dans le calendrier) | 4 |
| 47 | `neutralisation/neutralize-r30.py` | R30-1 à R30-4 RÉORIENTÉES : les formateurs du calendrier passent par `intlLocale` (même faute : une langue écrite en dur) | 4 |

Motif : le relevé statique des ancres des 15 campagnes que le tri sélectionne (`ancres-campagnes.txt`, `releve-ancres.py`) rend
6 ancres PÉRIMÉES par ce lot, 0 ancre CRLF : fc5 W-1 et W-2 (l'import `{ WEEKEND_DAYS, WEEK_START_DAY }` reçoit `intlLocale`), r30
R30-1 à R30-4 (`Intl.DateTimeFormat(locale, …)` devient `Intl.DateTimeFormat(intlLocale(locale), …)`). r30 se joue sous CRLF simulé
(conditionnel déjà déclaré : `crlf/r30.txt`), son ancre R30-4 étant écrite en CRLF.

## Extension 2 — commitée SEULE, avant le fichier qu'elle déclare

| # | fichier | rôle | commit |
|---|---|---|---|
| 48 | `docs/preuves/front-client/FC-6/portes/test-int-isole.txt` | les deux fichiers de concurrence (`quote-numbering`, `pro-clients`) rejoués SEULS sur le code du lot | 4 |

Motif : `test:int` rend 608/619 ; 8 des 11 rouges sont dans l'ensemble d'entrée (MD-1 ×2, F-1, F-2, F-3, F-4, F-6 ×2), mais trois
portent des titres HORS de son libellé (F-6 « le prochain numéro … SUIT le plus grand », F-7, F-8), tous en `deadlock detected`
dans le même fichier, à la suite d'un `read ECONNRESET` — la cascade que `etat-entree.md` décrit. La règle de la session (« un
rouge hors de ces tests de concurrence arrête la session ») se tranche par une MESURE, pas par un libellé : ce lot ne touche pas
`apps/api`, et les deux fichiers sont rejoués seuls, sur son code.

## Extension 3 — commitée SEULE, avant le fichier qu'elle déclare (le conditionnel « r30 sous CRLF simulé » s'est réalisé)

| # | fichier | rôle | commit |
|---|---|---|---|
| 49 | `docs/preuves/front-client/FC-6/crlf/r30.txt` | `neutralize-r30.py` joué sous CRLF simulé (le conditionnel de la table, réalisé : le tri a sélectionné r30) | 4 |

Motif : le contrôle de fin de lot ne lit que les LIGNES de la table ; ce conditionnel était nommé, chemin complet, dans la prose
sous la table — `controle.txt` l'a donc compté hors table. Il entre en ligne, comme l'exige la forme des extensions.
