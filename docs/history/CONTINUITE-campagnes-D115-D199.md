# Journal — campagnes qualité, UIP, Q + E3 (D115 → D199, archivé par R1)

⚠ **DÉPLACÉ, PAS RÉÉCRIT.** Le lot R1 a sorti ces journaux de
`ZWADJ_CONTINUITE.md` pour que le fichier d'état ne pèse plus 250 Ko à chaque
lecture. **Aucune ligne n'a été modifiée** : la non-perte a été vérifiée ligne à
ligne. Le registre des décisions, dans `ZWADJ_CONTINUITE.md`, pointe ici.

## Décisions verrouillées de la campagne qualité (D115 → D125)

**D115 — le mutex porte la SESSION, pas le jeton.** `bootstrap()` appelait
`raw("/auth/refresh")` en direct : le mutex single-flight existait et
fonctionnait, mais ne couvrait **qu'un des deux chemins** qui rafraîchissent.
Élargir le type de retour de `refreshAccessToken` → `refreshSession` est ce qui
rend l'unique chemin possible. Mesuré : 2 appels → 1.
⚠ **Ce mutex ne peut PAS couvrir deux ONGLETS** : il est par instance JS.

**D116 — fenêtre de grâce à la rotation, SANS re-rotation.** Colonne
`rotated_at` : la rotation seule donne droit à la grâce, jamais une déconnexion
ni une révocation après vol. Le rejeu gracié rend **un access token seul, aucun
`Set-Cookie`** — le pot à cookies porte déjà le jeton frais du gagnant.
⚠ La variante qui **rotait** dans la fenêtre laissait **un jeton orphelin vivant
par rechargement à deux onglets** : mesuré 1 → 2 → 11 sur dix cycles, et **10
survivaient à une déconnexion explicite**. « Se déconnecter » cessait de
déconnecter. La grâce exige aussi un **héritier vivant** (comparaison de
`created_at`, horloge Postgres des deux côtés).
⚠ **Résidu assumé** : une session ouverte sur un AUTRE appareil après ce jeton
rachète la lignée pendant 30 s. Colonne `replaced_by_id` refusée par Ko.

**D117 — le statut se lit SOUS VERROU, et une seule fois.** `assertStatus` était
lu hors transaction : deux acceptations concurrentes de la **même** demande
passaient toutes les deux, écrasaient `acceptedAt`/`paymentDueAt` et
**notifiaient le client deux fois**. L'`EXCLUDE` n'y peut rien — une ligne ne
chevauche pas elle-même. Le contrôle d'avant transaction est **supprimé**, pas
doublé (D78).
⚠ Le double `accept` **séquentiel** rendait déjà 409 : c'est ce qui masquait le
trou. Seul le cas **concurrent** passait.
⚠ Sur `send()`, **aucun défaut n'a pu être reproduit** — la sérialisation venait
de l'ordonnancement du pool de connexions, pas d'une garantie. Le correctif rend
structurel ce qui n'était qu'observé ; c'est écrit dans le code pour qu'aucune
relecture ne croie à un bug corrigé.

**D118 — socle e2e Playwright, à la demande.** Dossier `e2e/` à la racine, pile
**dédiée** sur ports dédiés (API 3101, Client 3100, Pro 5273), base `zwadj_e2e`,
`reuseExistingServer: false`, `retries: 0`.
⚠ **Serveurs de DÉVELOPPEMENT, délibérément** : `StrictMode` ne double le montage
que là, et c'est ce double montage qui a révélé D115. Contre un build de prod,
tous les tests A2 seraient verts sans rien garantir.
⚠ Le throttle se relâche par le **levier `THROTTLE_*` qui existait déjà** —
aucun aménagement du code de production n'était nécessaire.

**D119 — RBAC dérivé du routeur, jamais d'une liste écrite à la main.** 77 routes
(38 PRO, 5 ADMIN, 8 CLIENT, 16 authentifiées sans rôle, 10 publiques). Les
métadonnées sont lues là où le guard les lit.
⚠ Un huitième test **renverse la logique** : les routes authentifiées **sans**
rôle sont confrontées à une liste blanche de 16 entrées justifiées. Sans lui, une
route privée de son `@Roles` **sortait du périmètre** des sept autres.

**D120 — garde de forme ET frontière d'erreur, les deux.** `Array.isArray` sur
toute liste venue du réseau ; `SectionErrorBoundary` (la première du dépôt) posée
**par section**, jamais autour de la page.
⚠ Ce que la garde de forme ne peut pas couvrir : un tableau **valide** dont les
**lignes** sont amputées. Il faudrait valider chaque champ de chaque ligne à
chaque écran — c'est la place de la frontière.

**D121 — transitions sœurs en check-and-set.** `decline`, `cancelAsPro`,
`cancelAsClient`, `quote.decline` : `updateMany` conditionné au statut, rassemblé
dans `transitionStatus`. ⚠ **Pas de verrou ici** : aucun invariant ne traverse
plusieurs lignes ni plusieurs tables. Le `WHERE status IN (...)` fait le travail
du verrou sans en payer le prix.
⚠ `quote.convert` était différent et **pire** : la base arrêtait bien la seconde
conversion (`bookings.quote_id` UNIQUE), mais la violation remontait en **500** —
le même empêchement rendait 409 une milliseconde plus tôt.

**D122 — contrats api ↔ api-client.** Chemins appelés par `@zwadj/api-client`
confrontés au routeur Nest ; formes gelées sur le fil, écart contrôlé **dans les
deux sens** (un champ en trop est une fuite, un champ manquant casse le client).
⚠ TypeScript accepte qu'une ligne Prisma porte **plus** de champs que le DTO : un
`select` élargi passe le typecheck et part quand même sur le fil.
⚠ **4 chemins échappent au contrôle** (concaténés multi-lignes), nombre **gelé**.
⚠ `apps/client/src/lib/api.ts` **n'est pas couvert** — hors du paquet, 8 `as` non
validés.

**D123 — migration sur base NON VIDE.** Migrations appliquées sauf la dernière,
données réalistes semées, puis la dernière appliquée. `test:int` fait
`DROP DATABASE` : la classe entière des défauts qui n'existent qu'avec des
données lui échappe par construction.
⚠ **`prisma migrate deploy` sort en SUCCÈS sans rien appliquer** quand le
schema-engine est absent. Le harnais applique le SQL lui-même via `pg`. En
contrepartie il ne couvre pas `_prisma_migrations` ni les sommes de contrôle.

**D124 — contrat des tokens RÉSOLUS, pas de captures d'écran.** Les valeurs
résolues des variables CSS sont lues après cascade dans le navigateur, par app et
par thème.
⚠ Les pixels diffèrent entre Windows et Linux : des références d'image seraient
rouges au premier changement de machine, et un diff de pixels dit « quelque chose
a bougé » sans dire quoi.
⚠ Les **divergences légitimes** entre les deux thèmes sont **gelées** — exiger
zéro serait absurde, les thèmes diffèrent par dessein.

**D125 — accessibilité automatisée (axe-core).** 10 écrans, deux thèmes, page
arabe en RTL avec vérification du `dir`. 11 règles ciblées.
⚠ Les manquements connus sont **gelés au premier lancement** : exiger zéro
d'entrée rendrait le test rouge à la livraison, et « rouge = régression » doit
rester vrai. Le test refuse aussi les violations **corrigées** restées dans la
référence.
⚠ Les références de D124 et D125 **ne sont pas livrées** : elles se génèrent
(`UPDATE_TOKEN_BASELINE=1`, `UPDATE_A11Y_BASELINE=1`) puis **se relisent**. Une
référence écrite de mémoire serait fausse.
⚠ **La signature est `règle @ catégorie d'élément`, pas le nœud DOM.** La première
référence générée en vrai l'a imposé : **96 % de ses signatures (67 sur 70)**
contenaient un `:nth-child()` ou un `[href$=…]`. Vingt étaient indexées sur les
données de démonstration (`palais-des-rais`, `venue-card:nth-child(1..6)`), trois
sur la position d'un `h2` dans un formulaire. Insérer un champ ou changer une
graine aurait produit une violation « nouvelle » ET une « corrigée » pour un
simple déplacement — et on aurait pris l'habitude de régénérer sans lire. **Un gel
qu'on ne lit plus ne gèle rien.** Mesuré après réduction : **70 → 19 signatures,
0 % de fragiles.**

**D127 — préchauffage des routes avant la suite e2e.** Next et Vite compilent une
route à la PREMIÈRE demande ; avec deux workers, deux tests peuvent la demander
en même temps. Le premier vrai lancement de T4 a produit un `Test timeout` sur un
`page.goto` — pas une assertion, une navigation qui n'a pas fini.
⚠ **Le défaut n'était pas la lenteur mais la VARIANCE** : le test qui paie la
compilation dépend de l'ordre d'attribution aux workers, donc l'échec se déplace.
Un échec qui bouge finit relancé sans être lu — ce que `retries: 0` cherche à
empêcher. Un projet `warmup` avec `dependencies` paie la compilation hors de toute
mesure. ⚠ **Pas dans `globalSetup`** : rien n'y garantit que les serveurs soient
debout, et un préchauffage trop tôt échoue **en silence** en donnant l'impression
que le problème est traité. Effet mesuré : 5,1 min → **2,5 min**, 0 échec.

**D128 — le levier `THROTTLE_*` couvre AUSSI le limiteur par défaut.** Il ne
couvrait que `/auth` ; le limiteur global (100 / 60 s / IP, toutes les autres
routes) était **codé en dur** dans `app.module.ts`. Reproduit avant correctif :
sur 150 lectures consécutives d'une route publique, **51 refusées en 429**. Une
suite qui grossit échoue alors par grappes, sur des tests sans rapport avec ce
qu'ils mesurent. `DEFAULT_THROTTLE` vit désormais dans `auth.throttle.ts`, à côté
des limites d'auth : **un seul levier**, pas deux façons de désactiver la même
classe de protection. Après : **0 sur 150**.
⚠ **En production rien ne change** : `THROTTLE_DEFAULT_*` reste hors du schéma env
validé, et un test dédié vérifie **sur la source** que les défauts sont toujours
100 / 60 s — le spec tourne avec le levier posé, il ne peut pas observer le défaut
par lui-même.

**D129 — un token partagé ne se déplace PAS pour un écran.** `.alert-error`
rendait `--danger` (#dc2626) sur `--danger-soft` (#fef2f2) : **4,41:1**, sous les
4,5:1 de l'AA à 13 px. ⚠ **La cause vérifiée, pas supposée** : ce n'était pas
l'`opacity: 0.55` de `.is-soon` comme on pouvait le croire.
Correctif : token **dédié** `--danger-ink` (#b91c1c → **5,91:1**), déclaré sur les
DEUX thèmes. `--danger` est **inchangé** : il porte aussi le fond de `.btn-danger`,
les bordures d'erreur de champ et le texte d'erreur, dans les deux apps et les
deux thèmes — le bouger pour un écran, c'est exactement UI-D1 → UI-D2.
⚠ Sans la déclaration sombre, le token retomberait sur `inherit` et l'alerte
serait **pire** qu'avant. En sombre, `--dark-danger` mesure déjà 6,07:1.
⚠ `.alert-success` (#15803d sur #f0fdf4 = 4,80:1) est conforme, non touché.

**D126 — E3 se fait autrement.** Voir « ⛔ E3 — MÉTHODE RENFORCÉE ».


## Tranche UIP — Refonte de l'app Pro (D130 → D149)

Cinq livraisons enchaînées : **UIP-A** (coquille), **UIP-B** (parcours client sur
place), **D135** (contrat de contact), **UIP-C** (assistant de salle), **refonte
graphique**, puis deux correctifs de terrain. Aucun contrat d'API n'a bougé sur
A/B/C ; D135 et le correctif calendrier en ont bougé, chacun avec sa raison écrite.

### Ce que l'audit du dépôt a corrigé AVANT d'écrire une ligne

Trois « blocages » annoncés au cadrage n'existaient pas. Vérifié dans les
contrôleurs, pas supposé :

- **`POST /pro/bookings` n'est pas nécessaire.** Le parcours sur place se compose
  d'endpoints livrés : `POST /venues/:id/quotes` (PRO, `clientId` **facultatif**)
  → `send` → `convert` → `POST /pro/bookings/:id/accept`. La ligne du backlog qui
  le réclamait était en outre **périmée face à D101** : elle disait « created
  directly as `confirmed` », ce que D101 interdit.
- **Un devis converti PORTE un contact.** `quoteConvertSchema` l'exige dans le
  corps, « parce que `bookings.contact_*` est NOT NULL ». La dette « un devis sans
  `clientId` ne porte aucun contact » décrivait le devis, pas la conversion.
- **Bloquer une date, c'est `accept()`, pas E3.** `ACCEPTED` verrouille par la
  contrainte `EXCLUDE`. E3 n'ajoute que `CONFIRMED`.

### Les décisions

**D130 — La table de routes pro suit le top panel.** `/` est le **tableau de
bord**, la liste des salles passe à **`/salles`** — route enfin **déclarée** : elle
tombait sur `<Route path="*">` et redirigeait en silence, alors que la spec e2e A5
la listait déjà. `/salles/:id/calendrier` **disparaît** ; son calendrier devient
l'entrée « Calendrier », ses demandes et visites l'entrée « Demandes ».

**D131 — « Réservations » montre les DATES VERROUILLÉES** (`ACCEPTED` +
`CONFIRMED`), pas seulement `CONFIRMED`. Motif relevé dans `bookings.service.ts` :
« ce lot s'arrête à ACCEPTED. Aucune route ne mène à CONFIRMED ». Un écran filtré
sur `CONFIRMED` serait vide en permanence **et en silence**, pendant que le statut
qui verrouille réellement n'aurait aucun écran. Le jour d'E3, la ligne passe
`CONFIRMED` et l'écran devient littéralement « payées/confirmées » **sans être
retouché**. Partition étanche avec « Demandes » : une réservation ne s'annule que
depuis un seul écran.

**D132 — Le parcours de devis est le corps du tableau de bord.** `QuotesSection`
vivait sur une route démontée ; c'est déjà le parcours walk-in.

**D133 — ⚠ Une garde de forme devant un CHARGEUR sous `try/catch` est NUISIBLE.**
Trouvée par la campagne de neutralisation : deux `Array.isArray` du panneau gauche
ne mordaient pas. En cherchant pourquoi, la mesure a montré qu'elles étaient
redondantes **et** nocives — le `catch` contient déjà l'échec et affiche
« Indisponible » ; la garde le remplaçait par un **0**, c'est-à-dire un compte
FAUX présenté comme un fait sur une réponse de proxy en 502. D120 vise un `.map`
**dans le JSX**, où l'absence de garde emporte la section. Deux sentinelles
rougissent si quelqu'un les réintroduit par réflexe.

**D134 — ~~Deux compositions de devis cohabitent sur le tableau de bord~~** —
**annulée par la refonte graphique** : `QuotesSection` a été démontée sur demande
de Ko, pour être retravaillée. Voir la dette ci-dessous : cinq gestes sont
devenus inatteignables.

**D135 — L'e-mail de contact est FACULTATIF, le téléphone ne l'est pas.**
⚠ **Il n'y a eu AUCUNE migration** : `bookings.contact_email` est `String?` depuis
toujours et `contact_phone` est NOT NULL. **Seules les bornes Zod étaient plus
strictes que la base**, et elles rendaient inachevable le parcours sur place — le
cas qu'elles rejetaient est le client algérien au comptoir, pas un cas limite.
**D55, cinquième occurrence.** La clé est **omise** quand le champ est vide,
jamais `""` : `.email()` refuse la chaîne vide.

**D136 — L'étape 1 de l'assistant de salle est CRÉATRICE**, et porte exactement
les cinq champs que `venueCreateSchema` exige : `nameFr`, `nameAr`, `cityId`,
`capacityMax`, `basePriceCents`. C'est ce qui permet aux six étapes suivantes
d'écrire sur un **id réel**, et ce qui supprime l'asymétrie création/édition.
⚠ Alternative écartée par écrit : rendre `cityId`, `capacityMax` et
`basePriceCents` facultatifs fabriquerait des salles **sans prix de base**, que le
moteur de disponibilité, les règles de prix, la recherche et le devis devraient
tous apprendre à contourner.

**D137 — L'étape courante vit dans l'URL** (`?etape=N`), jamais dans un état
local : rechargement, bouton retour et adressabilité a11y viennent gratuitement.

**D138 — Un « Suivant » inactif DOIT dire ce qui manque**, et les messages par
champ n'apparaissent que sur les champs **remplis**. Défaut trouvé en exécutant :
désactiver le bouton supprimait du même coup l'affichage des messages, si bien
qu'un prix « 150000.5 » laissait le bouton grisé **sans indiquer le champ fautif**.
Une validation qui se tait accuse sans instruire ; une validation qui parle trop
tôt accuse d'avance.

**D139 — « Franchissable » ≠ « déjà visitée ».** Une salle existante ouvre les
sept étapes ; elles se referment toutes si l'étape 1 cesse d'être valide.

**D140 — Un seul calendrier, PILOTABLE.** `VenueCalendar` sert l'écran Calendrier
et le sélecteur de date du parcours. Une copie aurait été une seconde autorité sur
« ce jour est-il libre ? » (D78).

**D141 — Une seule chaîne de devis par session.** Le premier calcul crée, les
suivants appellent `revise`. Un devis par clic gonflerait de trois le dénominateur
du compteur de transformation pour une négociation à trois allers-retours.

**D142 — Une garde de forme se met devant un RENDU** (complète D133).
⚠ La mesure a corrigé la justification elle-même : un champ de mauvais **type**
n'écroule pas React, **il l'affiche**. Sans garde, l'entonnoir annonce « deux
envoyés · undefined aboutis ». Plus insidieux qu'une chute — une chute se voit.

**D143 — Un champ de saisie porte un `<label>` VISIBLE.** `aria-label` seul sert
les tests et la voix, et laisse quatre cases nues indistinguables à l'œil.

**D144 — ⚠ Un script de neutralisation compte ses EXÉCUTIONS autant que ses
remplacements.** `vitest -t <filtre>` sort en **0 quand aucun test ne
correspond** : après réécriture des tests, trois filtres ne matchaient plus rien
et le script lisait ces « 0 » comme « la garde est inutile ». C'est le vert creux
que ce script existe pour attraper, un étage au-dessus de lui. ⚠ La première
correction ne lisait que les « passed » et ratait le format `Tests 1 failed (1)` :
elle déplaçait le faux négatif au lieu de le supprimer. Le compteur lit le total
entre parenthèses.

**D145 — Le calendrier a DEUX PORTES et UN SEUL MOTEUR.** `bySlug` (publique,
filtre de publication intact) et `byIdForOwner` (pro, par propriétaire, sans ce
filtre) appellent le même `compute`. Un test d'intégration exige
`expect(pro).toEqual(pub)` sur une salle publiée : si les deux divergeaient d'un
centime ou d'un statut, le pro verrait autre chose que ses clients.

**D146 — ⚠ Une décision de RÉUTILISATION d'endpoint se vérifie sur l'état RÉEL le
plus courant de la donnée.** Le calendrier pro consommait la route publique — le
motif de B6 était juste (ne pas dupliquer le moteur), la vérification manquait.
`PUBLIC_BASE_WHERE` exige `publicationStatus = PUBLISHED`, or l'état courant d'une
salle neuve est **brouillon** : aucun pro ne pouvait voir son propre calendrier
avant publication, et la refonte a fait mourir l'écran principal avec.

**D147 — Toute borne de fenêtre côté front est IMPORTÉE du contrat.**
`AVAILABILITY_MAX_WINDOW_DAYS` compte **bornes incluses**
(`(to - from) / 86400000 + 1 > 92`). La section des visites demandait
`to = aujourd'hui + 92 jours`, soit **93 jours comptés**, et recevait un 400 à
chaque chargement. **D55, sixième occurrence** : la borne avait été écrite
d'intuition au lieu d'être dérivée du schéma.

**D148 — Les points d'ENTRÉE sont fermés à une session ouverte.**
`RequireProSession` empêchait d'entrer sans session ; rien n'empêchait d'en sortir
vers `/auth/connexion` **avec** une session valide — un pro connecté pouvait donc
se reconnecter par-dessus lui-même, voire avec un autre compte, en échangeant le
jeton sous une application déjà montée.
⚠ **Deux routes restent OUVERTES et ce n'est pas un oubli** :
`/auth/reinitialisation` et `/auth/verification-email` **consomment un jeton reçu
par e-mail**, et la vérification d'adresse est même atteinte *après* un changement
d'e-mail, donc forcément connecté. Les fermer casserait le parcours qu'elles
servent. Une neutralisation vérifie qu'y ajouter le garde rougit.

**D149 — La propriété d'une salle se traverse par la RELATION**, jamais par
égalité d'ids. `Venue.ownerId` référence **`ProProfile.id`**, pas `User.id` — le
schéma le dit : `owner ProProfile @relation(fields: [ownerId], references: [id])`.
Le premier correctif de D145 passait l'id **utilisateur** dans `ownerId` : la route
rendait 404 pour **tous** les pros. L'idiome correct est `owner: { userId }`, celui
de `visit-bookings.service.ts`. ⚠ Un identifiant qui « ressemble » se relève, il ne
se devine pas.

**D150 — Un chemin d'API se construit D'UN SEUL TENANT dans `@zwadj/api-client`.**
Le contrôle de chemins B6/D122 lit les **littéraux** : un chemin concaténé n'est
jamais comparé au routeur, il est seulement *compté*. Le plafond de chemins
non vérifiés passe de 4 à **0** et les cinq appels concernés sont réécrits en un
littéral. ⚠ Passer 4 à 5 aurait élargi l'angle mort en ayant l'air de le
documenter — un gel qui monte n'est plus un gel.

**D151 — Depuis UIP-A, `GET /pro/venues` appartient à la COQUILLE, pas à l'écran.**
`ProVenuesProvider` est monté au-dessus de toutes les routes : **un appel par
DÉMARRAGE**, zéro sur un aller-retour SPA. ⚠ Le nombre est **1, pas
`MONTAGES_PAR_RENDU`** : l'effet est déclenché par l'ARRIVÉE de l'utilisateur
(garde `isPro`), pas par le montage — StrictMode a déjà doublé quand la
condition devient vraie. A5 compare donc les empreintes une fois
`EMPREINTE_COQUILLE` retirée des deux côtés, **et vérifie qu'elle est réellement
demandée à froid**, sinon la constante devient un laissez-passer silencieux.
Le sens « présent à froid, absent en SPA » est bénin ; l'inverse reste interdit.

**D152 — « Sortie de la référence a11y » ne veut PAS dire « corrigée ».**
`color-contrast @ .field-hint` a quitté le tableau de bord parce que **D134** y a
démonté `QuotesSection` : l'élément a changé d'écran, son contraste n'avait pas
bougé d'un centième. Avant de retirer une ligne de `e2e/baselines/a11y.json`, il
faut trancher entre les deux cas **et l'écrire**. Le message d'axe a été corrigé
pour l'exiger.

**D153 — Un projet qui linte `.` doit ignorer ce que ses outils ÉCRIVENT.**
`e2e` n'a pas de `src` : `eslint .` avalait `playwright-report/` et
`test-results/`, soit **2 934 erreurs sur du JavaScript minifié**. Ignores
globaux dans `e2e/eslint.config.mjs` **et** trois lignes de `.gitignore` — ces
dossiers n'étaient couverts nulle part et seraient partis au dépôt. ⚠ Corriger
le lint sans le versionnement aurait traité le symptôme et laissé la cause.

**D154 — Ordre du panneau gauche pro, VOULU et divergent de la maquette (R2b).**
`Ma salle → Demandes → Calendrier → Réservations`, et rien d'autre. La maquette
range autrement ; l'écart est un choix produit. ⚠ Les **icônes sont conservées**
— il n'y avait aucune raison de perdre l'habillage parce que la séquence change.
« Compte » quitte le panneau et reste atteignable par le menu du bandeau
(`account.ui.menu.settings`), **vérifié avant retrait** : une entrée supprimée
sans second chemin est une page orpheline.

**D155 — Le voile d'accent, jamais la couleur écrite en dur de la maquette.**
Bandeau « Acompte reçu » et prestations sélectionnées utilisent `--accent-soft`
(#F1EFEE clair / #24201F sombre) et non le `rgba(200,30,99,0.0x)` de la maquette.
⚠ Raison technique, pas préférence : cette valeur **resterait rose sur une page
noire** — exactement la régression qu'UI-D2 a corrigée. Un rose littéral
exigerait une PAIRE de jetons, clair et sombre. D26 tient.

**D156 — Une flèche remplace un libellé sans perdre son NOM ACCESSIBLE.**
Les boutons de mois portent `aria-label` textuel, le glyphe est décoratif.
⚠ Le miroir RTL demande **deux** choses : `data-mirror-rtl` sur le `svg` **et** la
classe `.btn` sur le bouton, parce que la règle est scopée
`[dir="rtl"] .btn svg[data-mirror-rtl]`. En arabe, « suivant » pointe à gauche :
sans miroir, le visiteur part dans le mois opposé, sans erreur visible.
⚠ Lucide pose `aria-hidden` **tout seul** quand une icône n'a ni enfant ni prop
d'accessibilité : le risque n'est pas qu'on le retire, c'est qu'on AJOUTE un
`aria-label` — le nom du lien devient alors « Ma salle bâtiment ».

**D157 — Révéler un bloc, c'est déplacer le FOCUS, pas seulement défiler (R2d).**
Un défilement visuel ne déplace pas le curseur d'un lecteur d'écran. ⚠ Et
`focus()` défile tout seul, sèchement, en ignorant `prefers-reduced-motion` :
`preventScroll: true` est obligatoire, sinon l'écran saute PUIS glisse. Quand
`matchMedia` est absent, le défaut est « mouvement réduit » — se tromper vers
l'animation peut déclencher un vertige, se tromper vers le saut ne coûte que de
l'élégance. Helper unique : `apps/pro/src/lib/reveal.ts`.

**D158 — Téléphone : MOBILE uniquement, saisie locale acceptée, normalisation UNIQUE (R3).**
Borne `/^\+213[5-7]\d{8}$/`. Le schéma **accepte la saisie locale** (`0555 12 34 56`,
tirets, points, `00213…`, `213…`) et rend l'E.164 — personne ne tape `+213` de
lui-même. ⚠ Les fixes ne passent plus : `ProProfile.phone` est la **destination
WhatsApp** des notifications (D60), et un pro inscrit avec un fixe ne recevait
rien, sans erreur nulle part. Fonction unique et partagée
`packages/types/src/phone.ts`, sur le modèle de `roundToDinar` — le
dédoublonnage du futur portefeuille en dépend, et son **idempotence** est
mesurée. Message d'erreur refait : il disait « format attendu : +213XXXXXXXXX »,
c'est-à-dire qu'il enseignait ce qu'on a décidé de ne plus exiger.
⚠ Vérifié en base par Ko après livraison : **aucune ligne non conforme**.

---

### Machine à états du devis — cadrage Q (ex-« C1 »)

⚠ **RENOMMAGE.** Ces lots portaient le préfixe `C1`, déjà pris par « Flux C, lot 1
— plages hebdomadaires de visite » (livré). Correspondance :
`Q0` = ex-C1 cadrage · `Q1` = ex-C1b **livré** · `Q2` = ex-C1c · `Q3` = ex-C1d ·
`Q4` = ex-C1e · `Q5` = ex-C1f.

**D159 — REMPLACE D101. Les deux parcours sont DISTINCTS, et `Quote` est walk-in seul.**
D101 affirmait « mêmes lignes, mêmes statuts, mêmes transitions ». ⚠ Le code ne
l'a jamais fait : `booking-request-panel.tsx` appelle `POST /venues/:slug/bookings`
et **aucun `Quote` n'est créé** pour le parcours en ligne. La doctrine écrite
avait quitté le code, pas l'inverse. Corollaire : le commentaire de
`schema.prisma` sur `quoteId` (« NULL pour un walk-in ») est **inversé** — c'est
le parcours EN LIGNE qui laisse ce champ nul.

**D160 — Imprimer / envoyer un devis est un PARTAGE, sans effet sur le prix.**
Aucun état bloquant « remis ». `validUntil` disparaît : rien n'engage tant que
l'acompte n'est pas payé. L'acte est **bloqué si le téléphone ne passe pas
D158**. ⚠ La création d'une fiche client par ce geste est **hors périmètre** —
voir D166.

**D161 — `CANCELLED` absorbe `DECLINED`.** Un seul état, un seul bouton. La nuance
« le client a refusé » / « le pro a annulé » perd sa valeur opérationnelle dès
que le devis n'est plus envoyé à distance.

**D162 — Entonnoir : le dénominateur est le devis REMIS, et `expired` disparaît.**
Compté sur `sentVia`, pas sur `sentAt`. ⚠ Les quatre canaux incluent `IN_PERSON`
et `PHONE` précisément pour que le devis conclu de vive voix au comptoir — le
cas le plus courant — entre dans l'entonnoir au lieu d'en disparaître : sans
eux, l'indicateur **sous-compterait les affaires gagnées**.

**D163 — Un devis rattaché à une réservation est IMMUABLE, garanti EN BASE.**
⚠ Le versionnement était ce qui protégeait les montants : réviser créait une
ligne neuve, l'ancienne restait figée. `Booking.quoteId` **référence** le devis
sans recopier les montants — donc l'écrasement, sans cette garde, changerait
rétroactivement le montant d'une réservation acceptée, et payée une fois E3 en
place. Aucune erreur ne serait levée. Contrainte ou déclencheur SQL, pas une
vérification de service.

**D164 — Édition concurrente : verrou EXCLUSIF à l'ouverture (lot Q5).**
Un devis ouvert en modification n'a qu'un seul accès en écriture. Message
explicite au second, expiration après 5 min d'inactivité. ⚠ Deux cas à trancher
avant code : un pro qui ferme son onglet se verrouille **lui-même** dehors, et
deux onglets du même pro se bloquent mutuellement.
⏸ **REPORTÉE SANS ÊTRE RÉVOQUÉE — voir D193.** Les « deux cas à trancher » ne
sont pas des cas limites du verrou : ce sont les **seuls** qu'il rencontrera
tant qu'une salle n'aura qu'un utilisateur. La décision reprend vie avec les
comptes salariés.

**D165 — `chain_id` / `version` / `parent_quote_id` : neutralisées d'abord, supprimées en Q4.**
Tant que les colonnes existent, le retour arrière est une bascule de code ; une
fois supprimées, il faut une restauration de sauvegarde.

**D166 — ⚠ REDÉCOUPAGE 1 : `SENT` existants se trient par `booking_id`, pas en bloc.**
L'arbitrage initial disait « `SENT` → `DRAFT`, sans distinction de cas ».
`convert()` crée la réservation et **laisse le devis en `SENT`** : un `SENT` peut
donc déjà porter un `Booking`. Le basculer en `DRAFT` le rendrait éditable alors
qu'il adosse une réservation vivante — **la migration violerait D163**. Le
critère n'est pas « imprimé ou non » (irrécupérable, et l'arbitrage tient sur ce
point) mais `booking_id IS NULL`, information exacte et gratuite.

**D167 — ⚠ REDÉCOUPAGE 2 : Q2 est INDIVISIBLE, et le versionnement passe en Q3.**
Retirer `SENT` sans que rien n'écrive `sentVia` fait retomber l'entonnoir à zéro
en silence ; ne changer que `convert()` n'avance rien ; livrer l'API sans le
sélecteur de canal casse l'app pro. **Le canal ne peut être choisi que par une
personne : le basculement n'existe qu'avec son interface.** Et le passage de
`revise()` à l'écrasement quitte Q2 pour Q3 : il ouvre le trou de D163, donc il
arrive **avec** sa garde, jamais avant.

**D168 — Q1 (livré) : le canal de remise arrive SEUL, sans changer aucun comportement.**
Colonne `quotes.sent_via` **TEXT nullable** + `CHECK` anti-blanc. TEXT et non un
énuméré PostgreSQL : la liste des canaux est ouverte, un `ALTER TYPE` par
libellé serait une migration à chaque fois. Autorité unique du jeu de valeurs :
`quoteSentViaSchema` dans `@zwadj/types`. ⚠ **Aucune reprise de données** : un
vieux devis ne reçoit pas un canal inventé — l'entonnoir aurait l'air juste.
L'entonnoir compte encore sur `sentAt` à ce lot ; le basculement est Q2.

---


## Tranche Q + E3 (14→16/08/2026) — D169 à D191

⚠ **Deux décisions antérieures sont AMENDÉES par cette tranche. Lire d'abord.**

**D163 — PRÉMISSE FAUSSE, la décision tombe.** Elle justifiait une garde
d'immuabilité en base par : « `Booking.quoteId` référence le devis **sans
recopier les montants** ». Le code dit le contraire, vérifié :
`bookings.base_price_cents` / `services_total_cents` / `total_cents` /
`deposit_cents` sont commentées au schéma « *snapshots copiés du devis à la
création* », `convert()` les recopie une par une, recrée les lignes en
`bookingService`, fige le nom du créneau — et E3 facturera sur
`booking.basePriceCents`. **Aucun code ne remonte de la réservation vers le
devis** (recherche sur les quatre arbres : zéro occurrence). Écraser un devis ne
pouvait donc pas changer ce qui serait facturé. Même famille que D159 : doctrine
écrite qui a quitté le code.

**D165 — RÉVOQUÉE pour trois colonnes sur quatre.** `chain_id`, `version` et
`parent_quote_id` ne sont **pas** en sursis : la décision A garde le
versionnement. Seule `valid_until` a été supprimée (Q4).

---

**D169 — `supersedeActive()` DISPARAÎT, elle ne change pas de cible.** Elle visait
`ACTIVE_STATUSES = [SENT, ACCEPTED]` ; `ACCEPTED` n'a **jamais** été écrit (deux
lectures, zéro écriture) et `SENT` ne l'est plus. Conservée, elle serait devenue
un `updateMany` qui ne touche jamais une ligne — aucune erreur, aucun test rouge,
une protection qu'on croirait en place. ⚠ `lockChain()` est **conservée** :
`revise()` lit `MAX(version)` puis écrit `version + 1`, et
`quotes_chain_version_unique` refuserait la seconde de deux révisions
simultanées. La retirer « avec le reste » était le geste facile et faux.

**D170 — La garde du téléphone (D160/D158) vit dans l'ÉCRAN, et sur deux canaux.**
`SMS` et `PHONE` exigent un mobile valide ; `PRINT` et `IN_PERSON` non —
l'imposer aux quatre interdirait de déclarer un devis remis **en main propre** à
quelqu'un dont on n'a pas le numéro, le cas même que les canaux déclaratifs
couvrent. Et la garde est côté écran : `Quote` ne porte **aucun** téléphone
(`contact_phone` est sur `Booking`), donc une garde API demanderait un champ de
plus — un contrat neuf pour valider une donnée que le devis ne connaît pas.

**D171 — Les quatre canaux sont DÉCLARATIFS, `PRINT` et `SMS` compris.** Zwadj
n'imprime rien et n'envoie rien : ni générateur de PDF ni transport SMS dans le
dépôt. Les libellés disent « remis par », jamais « envoyer ». ⚠ « Envoyer par
e-mail » disparaît du parcours sur place : `EMAIL` n'est pas un canal.

**D172 — `SENT` et `SUPERSEDED` deviennent LEGACY : plus écrits, toujours lus.**
La migration a ramené en `DRAFT` les `SENT` **sans** réservation ; ceux qui en
portaient une l'ont gardé (D166) — les basculer aurait rendu éditable un devis
adossé à une réservation vivante. Retirer une valeur d'un énuméré PostgreSQL
impose de recréer le type : ce n'est pas l'affaire d'un lot de basculement.

**D173 — « Ce devis est-il encore ouvert ? » a UNE autorité : `isQuoteOpen`.**
Trois littéraux `status === "SENT"` recopiés dans l'écran, c'était trois endroits
où se tromper — et un jour un seul des trois corrigé.

**D174 — La disparition d'un BOUTON ne se voit que par une assertion de PRÉSENCE.**
Un bouton qui quitte un écran ne casse rien : pas d'exception, pas de type
invalide, pas de requête en échec. Les six portes passent au vert et le pro ne
peut plus conclure. ⚠ Corollaire : quand un lot retire un statut, **les fixtures
changent d'abord** — une fixture restée sur l'ancien état laisse la suite verte
sur un monde que la production ne produit plus.

**D175 — L'entonnoir REPART DE ZÉRO, prix d'un indicateur qui dit vrai.** Aucune
reprise de `sent_via` (D168) : les devis conservés en `SENT` sortent du
dénominateur. Le champ du DTO est renommé `sent` → `delivered` : le dénominateur
a changé de **définition**, et le renommage fait passer TypeScript sur chaque
lecture.

**D176 — La garde de forme D120 suit le CONTRAT, sinon elle refuse la forme
correcte.** `dashboard-aside.tsx` testait `expired` dans
`["sent","accepted","declined","expired"]`. Le champ disparaissant du DTO, la
garde devenait **définitivement fausse** : « Résumé indisponible » en permanence,
sur des données saines. Une garde de forme qui refuse la forme correcte est
**pire** qu'une garde absente — indistinguable d'une panne réseau.

**D177 — Une garde dont l'OBJET disparaît se retire par écrit, pas par oubli.**
La garde D117 protégeait `sentAt` : « le second envoi réécrirait la date que le
client a sous les yeux ». Cela supposait un envoi **unique et irréversible**. Une
remise ne l'est pas — imprimer puis envoyer par SMS sont deux gestes réels, et
réécrire `sentAt` est le comportement **attendu**. Le test « 201 + 409 » devient
« deux remises simultanées ne rendent jamais 500 », qui assertit **deux succès**.

**D178 — `CANCELLED` absorbe `DECLINED`, SANS reprise.** Troisième statut LEGACY.
Les basculer réécrirait l'histoire — « refusé par le client » deviendrait
« annulé » sur des affaires closes il y a des mois — pour un gain cosmétique.
⚠ **`BookingStatus.DECLINED` n'est PAS concerné.**

**D179 — L'entonnoir compte DEUX statuts perdus, et c'est la garde du lot.**
`QUOTE_LOST_STATUSES = [CANCELLED, DECLINED]`, importée par le service, jamais
recopiée. Sans elle, le compteur des affaires perdues **retomberait à zéro le
jour du déploiement** — tout l'historique est en `DECLINED`, et rien ne le
bascule. Champ renommé `declined` → `cancelled`, même raison qu'en D175.

**D180 — L'historique quitte l'ÉCRAN, pas la BASE.** Seule la dernière version
d'une chaîne est affichée ; le numéro de version reste. ⚠ **Conséquence
ouverte** : les versions antérieures ne sont atteignables depuis **aucune**
interface. C'est le pendant de la décision A — on garde la donnée *pour* le
litige, et le chemin d'accès reste à écrire (`[PRO][P2]`).

**D181 — Tout statut de l'énuméré doit avoir un libellé, et c'est mesuré.**
`t(`venue.ui.quotes.st_${status}`)` : ajouter `CANCELLED` sans `st_CANCELLED`
n'aurait produit **aucune** erreur — i18next rend la clé brute, et le pro aurait
lu « venue.ui.quotes.st_CANCELLED ». Le test boucle sur `Object.values(QuoteStatus)`,
pas sur une liste recopiée, sinon il ne verrait pas le statut oublié.

**D182 — Un chemin d'API dont l'ACTION est une variable échappe au test de contrat.**
Voir `AGENTS.md`, invariants. ⚠ Ma première correction — un intermédiaire
`post(path, body)` — a **supprimé** les routes de la vue du test au lieu de les
révéler : l'extracteur ne reconnaît que `request(...)` avec un littéral direct.
Trouvé en exécutant **l'extracteur lui-même**, recopié depuis le fichier, qui ne
touche ni la base ni Nest. **Quand une porte est inatteignable, sa partie pure
l'est souvent — l'exécuter vaut mieux que relire son code.**

**D183 — Q4 est le premier POINT DE NON-RETOUR.** Voir `AGENTS.md`, invariants.

**D184 — Ce que Q4 ne touche pas, chaque exception motivée.**
`quotes_one_sent_per_chain` : contraint encore les lignes héritées de D166 **et**
sert de TÉMOIN — le voir tomber signale un `prisma migrate dev` égaré, lequel
emporterait l'anti-double-booking et la FK composite B2.
`quotes_one_accepted_per_chain` : **redevient actif** avec E3.
⚠ **Point E3** : deux versions d'une même chaîne peuvent chacune porter une
réservation (`convert()` ne regarde que le devis visé) — deux passages en
`ACCEPTED` violeraient cet index **en 500**.

**D185 — Deux tests ne pouvaient PAS survivre à Q4, et c'est le signe qu'il a mordu.**
Ils écrivaient une `valid_until` passée en base. Les remplacer par des
« équivalents » qui n'écrivent plus rien aurait produit deux verts qui ne
mesurent rien : ils deviennent des assertions d'**absence**.

**D186 — L'autorité sur les garanties de la base est la MIGRATION.** Voir
`AGENTS.md`, invariants. ⚠ Erreur commise sur le chemin de l'argent, dans un
document de cadrage accepté.

**D187 — Une garde du chemin de l'argent vit dans un module PUR.**
⚠ **ARCHITECTURE CONFIRMÉE, MOTIF RÉÉCRIT (arbitrage Ko, 16/08/2026).** Le motif
d'origine — « les specs de service ne s'exécutent pas là où le client Prisma
n'est pas généré » — reposait sur une limite d'environnement **qui n'existe
plus** (D192). Le module pur reste, pour la raison qui survit à la mesure : il
se rejoue en millisecondes, sans base ni amorçage Nest, donc sa **neutralisation
est rejouable à chaque passage** au lieu d'attendre les portes lourdes. Sur le
chemin de l'argent, une garde vérifiée rarement est une garde vérifiée tard.
Effet mesuré à la livraison E3b : 12 tests, **6 gardes neutralisées 6/6**.

**D188 — Le montant du paiement est LU sur la réservation, jamais recalculé.**
`bookings.deposit_cents` est un instantané. Rejouer `resolveDepositCents`
produirait un second calcul du même montant — donc, le jour où une règle de dépôt
changera, deux montants pour une seule affaire. Un test fige un acompte **non
rond** qui passe tel quel : aucun arrondi correctif ne s'est glissé là.

**D189 — Aucune remise appliquée au checkout, et le test le FIGE.** Reste à
trancher si `Venue.cashbackRateBps` (D35) **est** la remise de checkout ou un
mécanisme distinct — `cashback_claims` décrit une réclamation vérifiée *après
coup*, ce qui n'est pas une réduction *au moment de payer*. Inventer la réponse
écrirait une règle monétaire par déduction. `discountAppliedCents = 0` est la
seule valeur qui n'affirme rien.

**D190 — L'adaptateur de paiement par défaut REFUSE, il ne simule pas.** 503, pas
une fausse session. Un faux qui marche ferait construire le reste du chemin
contre une forme **inventée**, et le vrai adaptateur devrait ensuite se conformer
à cette fiction plutôt qu'à l'API réelle (D126).

**D191 — Le module de paiement est enregistré sans avoir de route.** Nest résout
les providers d'un module **importé** au démarrage : laissé de côté jusqu'à E3c,
un câblage fautif ne se serait découvert qu'au moment de brancher Chargily — au
pire moment. ⚠ **Aucun contrôleur** : arrêt franc avant tout contrat d'API neuf,
et une route de paiement n'aurait rien à rendre sans session.

---


## Arbitrages du 16/08/2026 — D192 à D194

**D192 — Les portes API SONT exécutables en bac à sable ; le contraire était un
diagnostic, pas une mesure.**
Une erreur de type (`TS2345`, `quotes.service.ts:168`) est partie en livraison
avec Q3a et n'a été vue que par le `tsc --watch` de Ko. **La porte qui la voit
n'avait jamais tourné** : le rapport E3b annonçait « typecheck 4 paquets », API
non comprise, et l'empêchement était attribué au binaire Prisma.
⚠ Le blocage réel était **double, et le premier n'a rien à voir avec Prisma** :
`prisma.config.ts` appelle `env("DATABASE_URL")` et **jette avant que la
génération ne commence**. Une URL factice suffit — `generate` ne se connecte
pas. Le second (403 sur `binaries.prisma.sh`) se contourne par
`PRISMA_SCHEMA_ENGINE_BINARY=/bin/true` : le générateur `prisma-client` de
Prisma 7 est en **WASM** et n'a jamais eu besoin de ce binaire. Recette complète
dans `AGENTS.md`, invariants.
Mesuré après correction : `typecheck` **exit 0**, `lint` **exit 0**, **41
fichiers / 424 tests**, `nest build` **exit 0**. Contre-mesure faite : fichier
d'origine remis → **exit 2** avec exactement `TS2345` ligne 168 ; correctif remis
→ **exit 0**. La porte mord.
⛔ **Ce qui reste hors de portée** : migrations et tests d'intégration — il n'y a
ni serveur ni utilisateur `postgres` dans le bac à sable. Cette limite-là est
mesurée, pas supposée.
⚠ **Conséquence de méthode, plus large que Prisma** : « non exécutable » est une
mesure et se relève avec son message d'erreur exact. Recopié de rapport en
rapport, un empêchement survit à sa propre disparition — et couvre alors
précisément ce qu'il prétendait signaler. **Un empêchement se re-teste à chaque
tranche.**

**D193 — Q5 est REPORTÉ jusqu'aux comptes salariés : le verrou n'a personne à
exclure.**
`Venue.ownerId` pointe `ProProfile`, dont `userId` est **`@unique`**. Il n'existe
aucune table d'appartenance, aucun compte salarié : une salle a **exactement un**
utilisateur pro, et `ownedVenue()` le vérifie à chaque appel.
⚠ Un verrou exclusif d'édition n'a donc **aucune seconde personne** à écarter.
Les deux cas que D164 réservait à l'arbitrage — l'onglet fermé, les deux onglets
du même pro — ne sont pas des cas limites : **ce sont les seuls cas qui
existent**. Livré tel quel, Q5 n'aurait produit qu'un seul effet observable : un
pro qui se bloque lui-même cinq minutes.
Le verrou naîtra avec les gens qu'il sépare. **Rien n'est construit d'ici là**
(arbitrage Ko) — ni verrou par `userId` ré-entrant, qui serait un no-op tant
qu'il n'y a qu'un utilisateur.

**D194 — Le risque de concurrence RÉEL est ailleurs, et reste ouvert.**
Deux onglets qui `revise()` en parallèle ne perdent pas une écriture : la
décision A ayant conservé le versionnement, ils créent **deux versions** de la
même chaîne. D184 relève déjà que deux versions peuvent chacune porter une
réservation, et que deux passages en `ACCEPTED` violeraient
`quotes_one_accepted_per_chain` **en 500**.
⚠ C'est une divergence de chaîne, pas une écriture perdue — **un verrou d'écran
ne la couvre pas** ; un contrôle de version à l'écriture, oui. Lot distinct, non
cadré, à ne pas confondre avec Q5 le jour où celui-ci reprendra.


## Lot E3b (Chargily) — D195 à D199

**D195 — Chargily compte en DINARS. Mesuré, pas déduit.**
`amount: 5000` affiche « 5 000,00 DA » sur la page de règlement ; `amount: 1` est
refusé par « The amount field must be greater than or equal to 50. » Notre port
reste en **centimes** — c'est l'unité du système, et la faire varier selon le
destinataire ferait de chaque appelant un convertisseur. La conversion vit dans
l'adaptateur, seul fichier du dépôt qui connaît Chargily.
⚠ **Elle refuse, elle n'arrondit pas.** `roundToDinar` garantit des multiples de
100 : la division est exacte par construction. Si elle ne l'est pas, un montant
non arrondi est arrivé jusque-là — et arrondir produirait un **second calcul du
même montant** (D188) tout en masquant le défaut amont derrière un paiement qui
marche. 500 assumé : c'est notre incohérence, pas une erreur du client.
⚠ **Le minimum de 50 DA n'est PAS recopié.** Dupliquer une borne du fournisseur,
c'est promettre de la maintenir : le jour où il la déplace, nous refuserions des
paiements qu'il accepte, sans rien de rouge (D55). Son refus se traduit, il ne se
devance pas.
⚠ **Ce qui rend ce défaut redoutable** : un facteur 100 ne casse rien. Le
parcours marche, le client voit un montant, personne ne rougit.

**D196 — Deux URL de retour, et aucune ne fait foi.**
`returnUrl` devient `successUrl` + `failureUrl` (arbitrage Ko). ⚠ L'invariant
écrit dans le port : une redirection de navigateur **n'est pas une preuve de
paiement** — elle se rejoue, se forge à la main, se perd si le client ferme
l'onglet. Les deux pages affichent « vérification en cours » et lisent le statut
du `Payment` chez nous ; la vérité arrive par le webhook signé (E3c).

**D197 — E3a ROUVERTE, périmètre limité : deux modes de défaillance de l'appel
sortant.**
Ils manquaient à la liste, et D126 règle 4 interdit de coder un mode non listé.
1. **La création de session temporise.** ⚠ Le délai expire APRÈS l'envoi : le
   checkout existe peut-être. **Traitement : aucun réessai automatique.** Une
   nouvelle tentative créerait une seconde session pour une seule affaire. La
   session éventuellement orpheline est **inatteignable par le client** — son URL
   ne lui est jamais parvenue — et expire seule.
   ⚠ **Conséquence exécutoire pour E3c** : un webhook portant un
   `providerCheckoutId` inconnu doit être ignoré proprement, pas échouer.
2. **La création de session est refusée.** 502 et non 503 : le fournisseur est
   joignable, c'est la demande qu'il rejette. La distinction porte pour la
   supervision — l'un se réessaie, l'autre non.

**D198 — `PAYMENTS_ENABLED` allumé sans clé Chargily : le boot ÉCHOUE.**
Cette configuration bootait jusqu'ici sur `UnavailablePaymentGateway` :
l'exploitant croyait les paiements ouverts, chaque tentative rendait 503, et rien
au démarrage ne disait pourquoi. ⚠ **Aucun repli silencieux** — un repli rend
« configuration cassée » indiscernable de « paiements éteints ».
⚠ `CHARGILY_BASE_URL` n'a **aucun défaut** : seule la base de test a été
observée. Un défaut pointant le test ferait qu'une production mal configurée
encaisserait dans le vide. C'est le symétrique de `PAYMENTS_ENABLED` — là un
drapeau qui s'allume seul, ici une cible qui se choisit seule.
⚠ Le contrôle ne vit pas dans `PROD_REQUIRED_EXPLICIT` : il dépend du drapeau,
pas de `NODE_ENV`. Une recette allumée sans clé est aussi cassée qu'une prod.

**D199 — ⚠ LA PORTE DE PARITÉ NE VOIT PAS UNE ABSENCE SYMÉTRIQUE.**
E3b-socle levait `payment.errors.providerUnavailable` et
`` `payment.errors.${code}` `` : **aucune de ces clés n'existait, dans aucun des
deux catalogues.** La porte i18n compare FR à AR — une clé manquante des deux
côtés lui est parfaitement invisible. Le namespace `payment` est créé (8 clés,
951 = 951).
⚠ Second défaut du même endroit : `` `payment.errors.${decision.code}` ``
produisait `payment.errors.PAYMENTS_DISABLED` alors que tout le dépôt nomme en
`namespace.errors.camelCase`. Remplacé par une table
`Record<IntentRefusal["code"], string>` — un code neuf sans message ne compile
plus.
⚠ **Dette ouverte** : rien ne relie encore une clé LEVÉE par le code à une clé
EXISTANTE au catalogue. C'est le même angle mort que D182.

---

