# D348 — lecture adverse de la consigne du rang 50 (PUB-1), contre le dépôt à `26ad5c7`

Faite par la session, **avant** tout `.md` d'autorité et avant toute mesure. Chaque ligne : ce que la consigne affirme, ce que le dépôt dit, et le verdict — ✓ conforme · ≈ conforme avec une nuance qui change la mesure · ✗ écart · ? non vérifiable depuis le dépôt. Rien ci-dessous n'est une mesure du comportement : ce sont des **lectures** (la consigne le dit elle-même : « par LECTURE, donc à mesurer »).

## A. L'état attendu à la reprise (point 0)

| # | affirmation | lu | verdict |
|---|---|---|---|
| A1 | `origin/main` = `26ad5c7` | `git fetch` puis `git rev-parse` : `26ad5c77ec03a73d82e92368f7d97c4beac7556f`, égal à `HEAD` | ✓ |
| A2 | arbre propre, sans stash, sur `main` | `git status --short` : 0 ligne ; `git stash list` : 0 ; branche `main` | ✓ |
| A3 | rang 49 CLOS (D347), compteur VINGT-TROIS, « RANG 50 : EN ATTENTE DE CADRAGE DU RELECTEUR » | `ZWADJ_CONTINUITE.md`, ordre des rangs (lignes 2675 et 2677) et bloc « ÉTAT À LA CLÔTURE DU RANG 49 » | ✓ |
| A4 | numéro D348 libre | dernière ligne du registre : D347 | ✓ |
| A5 | branches distantes « en plus de main » : `front-client` (43996e2) et `par-carte` (7fdc679) | `front-client` 43996e2 ✓, `par-carte` 7fdc679 ✓ — **et une troisième, `integration-45` (63511ce), que la consigne n'annonce pas** | **✗** (non bloquant : « tu n'y touches pas » vaut pour elle aussi ; écrit au rapport) |
| A6 | état machine : secteur, Docker lancé, chrome et headless_shell à 0 | `BatteryStatus` = 2 (100 %), Docker 29.8.0, 0 processus `chrome`/`headless_shell` ; RAM libre ≈ 4 028 Mo | ✓ |
| A7 | le message du rang 50 du 10/11 est `claude/rang50-message.md` | **aucun dossier `claude/` dans le dépôt** : le fichier n'est pas dans l'arbre suivi. La consigne dit qu'il N'EST PAS adopté ; rien n'en dépend | ? (sans conséquence) |

## B. Les constats du relecteur « par lecture » (point 2)

| # | affirmation | lu | verdict |
|---|---|---|---|
| B1 | `searchVenues` lit `GET /venues` avec `cache: "no-store"` | `apps/client/src/lib/api.ts:76` ; l'accueil et `/salles` ont `export const dynamic = "force-dynamic"` | ✓ |
| B2 | la fiche est gardée 300 s (`getVenueBySlug`, `revalidate: 300`) | `api.ts:193` ; la page de la fiche n'a PAS de `dynamic` ni de `generateStaticParams` (son en-tête le dit) | ≈ — ce que Next fait d'un `notFound()` (la **404 est-elle gardée** ?) n'est pas lisible : c'est la mesure M-3 (i) |
| B3 | la liste exige « publiée, non supprimée, ACTIVE » | `venues-public.service.ts:146-148` (`PUBLIC_BASE_WHERE`) et `:188` (`status: ACTIVE`) | ✓ |
| B3′ | (nuance non écrite par la consigne) le **détail** n'exige pas ACTIVE | `:141-144` : `PUBLIC_DETAIL_STATUSES` = ACTIVE et **TEMPORARILY_UNAVAILABLE** ; seul HIDDEN est un 404 | ≈ — la ligne « statut autre qu'ACTIVE » de M-2 se **dédouble** : HIDDEN et TEMPORARILY_UNAVAILABLE n'ont pas la même réponse (liste absente dans les deux, fiche absente seulement pour HIDDEN) |
| B4 | hors production, quand la liste est VIDE, des salles fictives s'affichent avec un bandeau | `home-view.tsx:87` (`recent === null || recent.items.length === 0`) et `search-view.tsx:157` ; `previewVenuesFor(nodeEnv)` rend `null` en production | ✓ |
| B4′ | (conséquence non écrite) le repli ne joue que sur un catalogue **vide** | si UNE salle réelle existe, les fictives ne s'affichent pas — **et « avant la publication, les fictives sont là » n'est vrai que sur une base sans aucune salle publiée** | ≈ — voir C1 |
| B5 | la publication n'existe que par `POST /admin/venues/:id/publish` | seul `venues-admin.service.ts:70` écrit `PUBLISHED` hors tests et hors génération Prisma | ✓ |
| B6 | elle refuse une salle sans créneau actif | `:55-67` : 409 `SLOT_TEMPLATE_REQUIRED` ; et `slot-templates.service.ts:186` refuse de retirer le dernier créneau actif d'une salle PUBLIÉE | ✓ — conséquence : « publiée sans créneau actif » **ne s'obtient pas par l'API** ; M-2 ne peut jouer ce cas que par la base (comme le harnais le fait déjà pour l'élévation d'un compte) |

## C. Ce que la consigne demande et que le dépôt rend difficile ou contradictoire

| # | point | lu | décision de la session |
|---|---|---|---|
| C1 | R-1 : « l'accueil la montre et les salles fictives ont disparu avec leur bandeau » | l'e2e tourne sur UNE base `zwadj_e2e` recréée à chaque lancement, mais **deux** travailleurs jouent des specs en parallèle et plusieurs créent des salles publiées : dans la suite complète le catalogue n'est **pas vide** au moment « avant » | La spec **affirme APRÈS** la publication (la carte de la salle est là ET le bandeau est absent — c'est cela qui garde « une fausse salle à côté d'une vraie »). Le moment « AVANT » (fictives + bandeau, sur catalogue vide) se **mesure une fois, spec jouée seule** (`--grep`, base vide), et la pièce est versée ; il n'est **pas** affirmé dans la suite complète. Écrit au rapport |
| C2 | R-1 : « l'accueil la montre » | l'accueil ne lit que **six** salles par grille (`pageSize: 6`, `recent` et `price_asc`) : sur une base qui en porte plus de six, la nouvelle salle peut ne pas y figurer sans qu'il y ait défaut | La salle de la spec est la **plus récente** ET la **moins chère** (deux chances). Le cas « sept salles plus récentes entre-temps » est possible sous deux travailleurs : s'il se produit, c'est une instabilité de la spec, pas un défaut — à lire, jamais à relancer sans lire |
| C3 | R-1 : « `/salles` la montre … avec chaque filtre qui lui correspond (ville, invités, budget, style, équipement, date) » | `/salles` rend 12 par page ; la spec choisit une **commune** que les autres specs n'utilisent pas, une capacité et un prix propres, pour que le résultat filtré soit la salle seule | à écrire ; le filtre « date » exige un créneau actif (la salle en a un) |
| C4 | R-1 : « un pro crée une salle par l'écran (créneau, prix, photo) » | `r37` crée par l'écran l'étape 1 seulement ; le créneau et la photo passent par d'autres étapes de l'assistant (7 étapes) | à jouer par l'écran, étape par étape ; si un geste d'écran est impraticable en Playwright, il est **nommé** et remplacé par l'appel d'API, jamais silencieusement |
| C5 | R-3 : « Durée réduite pour la mesure seule, sur une copie hors du dépôt, déclarée, jamais commitée » | la durée réelle est de 300 s : **mesurable telle quelle** (quelques minutes par salle) ; une copie du client hors du dépôt n'est pas simple (espace de travail pnpm, liens de paquets) | La session mesure avec la **valeur RÉELLE** (aucune retouche, donc rien à restaurer), et le déclare. Si la valeur réelle rend la mesure impraticable, elle s'arrête et le dit — elle ne modifie pas le dépôt pour l'accélérer. `next build` écrit dans `apps/client/.next` (ignoré par git), que le serveur de développement de l'e2e utilise aussi : **les deux ne tournent pas en même temps** |
| C6 | R-3 (iii) : « une salle masquée ou supprimée reste-t-elle visible, et combien de temps ? » | si la fiche est gardée 300 s et que le 404 n'est pas gardé mais le 200 l'est, une salle masquée **resterait visible jusqu'à 300 s** : c'est exactement le cas où R-4 permet un correctif (« fait mentir la page sur une salle masquée ou supprimée ») | mesure d'abord ; rien n'est corrigé avant son rouge versé |
| C7 | R-2 : « compte du pro supprimé » | `account-deletion.service.ts` : la suppression approuvée met `deletedAt` sur les salles du pro (`:206-212`) ; le chemin passe par `POST /me/deletion-request` puis `POST /admin/deletion-requests/:id/approve` | rejouable par l'API réelle ; ne touche ni schéma ni contrat |
| C8 | R-2 : « ce que le PRO lit de son côté » | l'application Pro affiche un badge de publication (`venue-list-page.tsx:205`, `PublicationBadge`) ; ce que le pro lit d'une salle MASQUÉE ou TEMPORAIREMENT INDISPONIBLE reste à relever à l'écran | relevé à l'écran, par la spec |
| C9 | R-6 : fichiers de `par-carte` | `git diff --name-only origin/main origin/par-carte` : **155 fichiers**, versés dans `par-carte-fichiers.txt`. Parmi ceux qu'un correctif d'affichage pourrait toucher : `apps/api/src/venues/venues-public.service.ts`, `apps/client/src/lib/api.ts`, `apps/client/src/components/home-view.tsx`, `apps/client/src/components/search/search-view.tsx`, `apps/client/src/components/venue/venue-detail-view.tsx`, `apps/client/src/lib/search-query.ts`, `packages/types/src/venue.ts`, et les deux catalogues `packages/i18n/messages/{fr,ar}.json` | tout correctif sur l'un d'eux est le plus petit possible et déclaré ligne par ligne ; `apps/client/src/app/[locale]/page.tsx` et `…/salles/[slug]/page.tsx` ne sont PAS dans la liste de `par-carte` |
| C10 | « Toute chaîne visible en FR et AR, parité » | la spec n'ajoute aucune chaîne à l'application ; un correctif qui en ajouterait liste ses clés arabes | sans objet tant que rien n'est corrigé |
| C11 | R-7 : aucun contrat d'API neuf, aucune migration | la spec n'appelle que des routes existantes ; M-2 par la base seulement pour **élever un compte** et pour **désactiver un créneau** d'une salle publiée (le cas que l'API refuse), sur la base e2e jetable | ✓ — déclaré ; aucune écriture sur la base de développement de Ko |

## D. Ce que cette lecture ne couvre pas

Elle ne dit rien du **comportement** : que la salle apparaisse, qu'un 404 soit gardé, que les chiffres de délai soient ceux de Next 15 — c'est M-1, M-2, M-3. Elle ne juge pas non plus la lisibilité à l'écran (le constat visuel est un geste de Ko).

## E. Bilan

**26 lignes lues · 1 écart (A5, branche `integration-45` non annoncée) · 1 non vérifiable sans conséquence (A7) · 6 nuances qui changent la mesure (B2, B3′, B4′, B6, C1, C2) · 0 écart qui arrête le lot.**
