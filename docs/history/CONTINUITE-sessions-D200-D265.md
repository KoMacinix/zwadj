# Journal — sessions du 17/08 au 28/08/2026 (D200 → D265, archivé par R1)

⚠ **DÉPLACÉ, PAS RÉÉCRIT.** Le lot R1 a sorti ces journaux de
`ZWADJ_CONTINUITE.md` pour que le fichier d'état ne pèse plus 250 Ko à chaque
lecture. **Aucune ligne n'a été modifiée** : la non-perte a été vérifiée ligne à
ligne. Le registre des décisions, dans `ZWADJ_CONTINUITE.md`, pointe ici.

## Session du 17/08/2026 — D200 à D209

**D200 — Aucune valeur réelle dans un fichier d'EXEMPLE.**
Les clés Chargily de test — publique et **secrète** — vivaient en clair dans
`apps/api/.env.example`. ⚠ `.gitignore` ne couvre que `.env` : ce fichier est
SUIVI, poussé, et recopié par chaque poste qui fait `cp .env.example .env`. Un
fichier d'exemple documente des NOMS et des FORMATS, jamais des valeurs.
Retirées ; le bloc porte l'avertissement en tête. Deux variables fantômes
(`CHARGILY_API_KEY`, `CHARGILY_WEBHOOK_SECRET`) qui n'existent pas dans `env.ts`
sont supprimées, trois manquantes documentées.
⚠ **Leçon de méthode, plus large** : mon premier balayage de secrets s'est
terminé sur un `head -10` saturé de faux positifs, et affichait « (fin) ». **Un
audit tronqué se lit comme un audit complet.** Le second, sans troncature ni
filtre, a sorti les deux lignes en une seconde.
⚠ La rotation d'identifiants reste la dette la plus ancienne du dépôt : signalée
au Lot 8 pour `GOOGLE_CLIENT_SECRET`, jamais faite.

**D201 — Le flux Pro devient un assistant EXCLUSIF, et le récapitulatif ne se
replie jamais.**
Une seule question à l'écran ; chaque réponse validée se fige dans un
récapitulatif qui grandit au-dessus.
⚠ **Ce qui est répondu SE DÉDUIT DES DONNÉES, jamais d'un compteur.** La maquette
tient un `confirmedUpTo` et le remet à `n - 1` quand on modifie l'étape `n` :
corriger une faute de frappe au nom du client ferait disparaître la date, le
créneau et les prestations. Un compteur peut diverger de l'état réel ; une
réponse présente en mémoire, non. Seule l'étape des prestations porte un drapeau,
parce que « aucune prestation » est une réponse valable et indiscernable de « pas
encore répondu ».
⚠ Corollaire : une correction qui INVALIDE une réponse suivante l'efface et le
DIT (changer la date rend le créneau caduc). Garder à l'écran un créneau qui
n'existe plus serait pire que de le perdre.
⚠ Le récapitulatif étant AU-DESSUS (maquette), `revealAndFocus` devient
STRUCTUREL : chaque étape franchie pousse la carte active vers le bas, et sans
lui la question sortirait de l'écran sur un portable. En position basse il
n'aurait été qu'un confort.

**D202 — Aucun montant dans le récapitulatif avant l'étape Devis.**
Seul écart assumé avec la maquette, qui met un prix dans la ligne « Date », un
sous-total dans celle des prestations, et calcule `Math.round(total * 0.3)` —
exactement ce que le fichier refusait déjà (D81 : acompte PAR SALLE ; D188 : pas
de second calcul du même montant). Le récapitulatif accumule des RÉPONSES.
⚠ Chiffrer étape par étape exigerait une route d'essai à blanc : appeler
`create`/`revise` à chaque étape ferait cinq versions pour une affaire.

**D203 — Un seul `VenueCalendar` monté, une prop `show`.**
Date et créneau sont deux ÉCRANS (maquette), mais deux `<VenueCalendar>` dans
deux branches distinctes se démonteraient l'un l'autre : rechargement de la
disponibilité et clignotement de la grille, au moment précis du clic. Une seule
instance, dont on change ce qu'elle MONTRE (`month` / `slots` / `all`).
⚠ Et `onSelectDate` est OBLIGATOIRE dans les deux cas : sans lui le calendrier
n'est pas piloté, il ignore `selectedDate` et retombe sur sa sélection interne à
`null` — donc aucun jour, donc aucun créneau. Défaut réel, trouvé avant test.

**D204 — L'accueil ne promet pas ce que le produit n'a pas.**
⛔ **Les Awards ne se construisent pas.** La maquette nomme des lauréats : un
concours qui n'existe pas, décerné par nous, à un professionnel qui ne l'a pas
gagné. Ce n'est pas un placeholder, c'est une allégation commerciale sur une
entreprise réelle — le garde-fou « données de démonstration signalées » a été
écrit pour des salles fictives dans une grille, il ne couvre pas ça.
⚠ **Les catégories de prestataires** sont rendues « à venir » : les NOMS sont
autorisés (ils annoncent une intention), les COMPTES non (`142`, `87`… sont des
affirmations vérifiables et fausses), les liens non (rien à ouvrir), les photos
non (D208). Ce sont des `<li>`, pas des boutons désactivés : il n'y a rien à
ouvrir, donc rien à désactiver.
⚠ « Les salles d'exception » est devenue « Récemment ajoutées » et la petite
grille prend `price_asc` : la maquette affichait `slice(0,6)` puis `slice(3,6)`,
soit les mêmes salles deux fois, et « d'exception » revendiquait une curation
sans mécanisme de curation. Les deux grilles s'adossent aux deux SEULS tris que
l'API expose.
⚠ Les quartiers sont RELEVÉS des salles publiées, sans compte (un compte tiré
d'une page serait faux) et NON CLIQUABLES : le contrat filtre par `cityId`, pas
par quartier — une puce cliquable serait un lien mort.

**D205 — ⚠ UNE GARDE QUI VIT DANS UN COMPOSANT SERVEUR NEXT EST INVISIBLE.**
« Aucune salle de démonstration en production » était un ternaire dans
`page.tsx`. Correct — et jamais exécuté : nul test ne rend un composant serveur.
Le harnais l'a montré, **muter la page laissait 19 tests verts**, et six salles
inventées seraient parties chez les visiteurs.
La décision devient `previewVenuesFor(nodeEnv)`, fonction pure et testée.
⚠ Elle ne viole PAS le garde-fou « un module de données ne décide pas seul
quand il s'affiche » : l'environnement lui est PASSÉ. Ce qui était interdit,
c'est de lire `process.env` soi-même — pas de savoir répondre quand on demande.

**D206 — L'assistant de filtres vit sur une ROUTE DÉDIÉE.**
Il exige JavaScript (étapes, compteur). `/salles` n'en a pas besoin et n'en aura
pas besoin — filtres en `<form method="get">`, pagination en liens — parce
qu'elle vise un Android bas de gamme sur réseau lent et qu'elle existe pour le
référencement. Le mettre À LA PLACE de son formulaire aurait privé de recherche
tout visiteur sans JS. L'accueil y renvoie par un LIEN, à côté du formulaire.
⚠ Quatre étapes, toutes FILTRANTES. La maquette en pose six et jette deux
réponses : son `SearchPage` n'utilise ni `district` ni `date`. Le « quartier »
devient la COMMUNE (`cityId`, le vrai filtre) ; la date attend `availableOn`.
⚠ Défaut réel trouvé en écrivant : un client qui PASSE toutes les questions
retombait indéfiniment sur la première et n'atteignait jamais les résultats. On
avance vers la première question sans réponse **après celle qu'on quitte**.

**D207 — Le compteur de salles vient du SERVEUR.**
La maquette calcule `liveCount` dans le navigateur en filtrant son tableau.
Refaire ça réécrirait côté client le filtrage que le serveur porte — **une
seconde autorité sur « quelles salles correspondent »**, qui divergerait au
premier critère ajouté. C'est le `total` d'un `GET /venues?…&pageSize=1`.
⚠ Chaque coche ANNULE la requête précédente : sans cela, deux réponses lentes
arrivent dans le désordre et affichent le compte d'un état déjà quitté.
⚠ `null` = « je ne sais pas », **jamais « zéro salle »** : l'un invite à élargir,
l'autre est une panne.

**D208 — Les photos de la maquette ne partent pas en production.**
Quinze URL Unsplash absolues, servies à chaque visiteur d'une page qui vise un
Android bas de gamme sur réseau lent : quinze requêtes vers un tiers, sans
`remotePatterns`, sans trace de licence, et sans qu'aucun prestataire ne soit
référencé derrière. La zone média existe, remplie d'un dégradé dérivé des tokens
du site — coût réseau nul. ⚠ Le balisage est PRÊT : le jour où des visuels
locaux existent, c'est un `<img>` à poser dans le `<span>` et rien d'autre.

**D209 — ⚠ SIX FAÇONS DONT UN TEST NE MESURE RIEN.**
Toutes relevées par le harnais de neutralisation cette session, **aucune par
relecture**. Le harnais a rendu 6/10, 7/11 puis 7/9 au premier passage — soit,
à chaque lot, un tiers de tests qui ne mesuraient pas ce que leur nom annonçait.

| # | Forme | Exemple de la session |
|---|---|---|
| 1 | **Mesure confondue** | La ligne « créneau » manquait au récapitulatif parce qu'on était À l'étape créneau, pas parce que le créneau avait été effacé |
| 2 | **Mutation auto-neutralisée** | Muter un `useMemo` dont les dépendances n'incluent pas la variable mutée ne change rien |
| 3 | **Rôle absent** | `queryByRole("link")` sur un `<a>` SANS `href` rend `null` même quand le bloc s'affiche — le test passait sur un écran cassé |
| 4 | **Fixture à un seul élément** | `join(";")` et `join(",")` rendent la même chaîne sur une liste d'un élément |
| 5 | **Nom accessible plus riche** | Le nom d'un jour de calendrier porte son état et son tarif — `/^15$/` ne correspond à rien |
| 6 | **Valeur monétaire tapée à la main** | `Intl` en `fr-DZ` insère des espaces insécables ÉTROITES (U+202F) |

⚠ La leçon commune : **un test qui n'a jamais échoué n'a jamais rien prouvé.**
Le harnais n'est pas une formalité de fin de lot, c'est le seul instrument qui
distingue une suite qui mesure d'une suite qui décrit.

---

### Compteurs — MESURÉS au 17/08/2026, fin de session

| Gate | Valeur |
|---|---|
| typecheck | 6 paquets + API, 0 erreur |
| lint | exit 0 partout |
| tests unitaires | API **454** · pro **339** · client **203** · api-client 34 |
| i18n | **1079 = 1079** (943 en début de session) |
| builds | `pnpm -r run build` exit 0 |
| neutralisation | flux Pro **14/14** · accueil **11/11** · assistant **9/9** · E3b 12/12 |

⛔ **Non mesuré, raison vérifiée** : migrations et tests d'intégration — aucun
PostgreSQL en bac à sable (D192) ; l'appel réseau réel vers Chargily —
`pay.chargily.net` hors liste d'autorisation ; les plans de requête d'`availableOn`.

---

### Compteurs — MESURÉS au 16/08/2026, lot E3b (Chargily)

| Gate | Valeur |
|---|---|
| typecheck | **6 paquets + API**, 0 erreur |
| lint | exit 0 partout, API comprise |
| tests unitaires | **API 43 fichiers / 454** · pro 327 · client 164 · api-client 34 |
| i18n | **951 = 951** — plancher relevé 943 → 951 |
| builds | `pnpm -r run build` exit 0, `nest build` compris |
| **neutralisation** | **12 / 12** gardes neutralisées, chacune ROUGE puis restaurée VERTE |
| captures réelles | 2 fixtures versionnées, **aucune valeur attendue écrite à la main** |

⛔ **Non mesuré** : migrations et tests d'intégration (aucun PostgreSQL en bac à
sable) ; l'appel réseau réel vers Chargily (`pay.chargily.net` hors liste
d'autorisation) — l'adaptateur est exercé contre `fetch` espionné, pas contre le
bac à sable.

---

### Compteurs — MESURÉS au 16/08/2026, APRÈS réouverture des portes API (D192)

| Gate | Valeur |
|---|---|
| typecheck API (`tsc --noEmit`) | **exit 0** — première mesure réelle du dépôt |
| lint API (`eslint src prisma`) | exit 0 |
| tests unitaires API | **41 fichiers / 424 tests**, 0 échec |
| build API (`nest build`) | **exit 0** |
| contre-mesure du correctif | sans lui **exit 2 / `TS2345`** · avec lui **exit 0** |
| `AGENTS.md` dépôt ↔ projet | écart = **une ligne vide finale** — dette `[REPO][P1]` close |

⛔ **Non mesuré, et pour une raison vérifiée** : migrations et tests
d'intégration — aucun PostgreSQL dans le bac à sable.

### Compteurs — MESURÉS au 16/08/2026 (tranche Q + E3)

| Gate | Valeur |
|---|---|
| typecheck | 4 paquets hors API, 0 erreur · **lint API vert** |
| tests unitaires pro | **327** (référence d'entrée Q2 : 313) |
| tests unitaires client | 164 · api-client 34 |
| specs API **exécutables** | `payment-intent` 12 + `env` 19 + `i18n-parity` 5 = **36** |
| i18n | **943 = 943** — plancher relevé 937 → 943 |
| builds | Vite ✅ · Next ✅ |
| neutralisation | **25 / 25** (11 Q2 · 5 Q3a · 3 E3a · 6 E3b) |

⛔ **Jamais exécuté en bac à sable** (`binaries.prisma.sh` répond 403, ni
PostgreSQL ni Docker) : migrations Q2 et Q4, tous les tests d'intégration, build
API, `payments.service.ts`. ✅ **Q2 et Q3a confirmés verts sur base réelle par
Ko** ; Q4 et le socle E3b restent à vérifier.
⚠ **CE CONSTAT EST PÉRIMÉ POUR LA MOITIÉ DE SON CONTENU — voir D192.** Le
typecheck, les tests unitaires et le build de l'API s'exécutent ; c'est le
diagnostic qui était faux, pas la mesure. Seuls migrations et intégration
restent réellement hors de portée. **Le tableau ci-dessus n'est pas réécrit** :
il dit ce qui a été mesuré ce jour-là, et c'est précisément ce qu'un compteur
daté doit dire.

### Compteurs — MESURÉS à la clôture de la tranche UIP (10/08/2026)

| Gate | Valeur |
|---|---|
| typecheck | **6 paquets** hors API, 0 erreur |
| lint | exit 0 — `ui`, `api-client`, `pro`, `client` |
| tests unitaires pro | **26 fichiers / 297 tests** (référence d'entrée : 20 / 240) |
| tests unitaires client | **15 fichiers / 162 tests** (référence : 15 / 160) |
| i18n | **937 = 937** — plancher relevé 843 → 868 → 910 → 926 → 937 |
| builds | Vite ✅ · Next ✅ |
| neutralisation | **24 / 24 gardes prouvées mordantes** |

> ⛔ **Ce que le bac à sable n'a PAS pu mesurer, et pourquoi.**
> `binaries.prisma.sh` est bloqué par la politique réseau (403) et
> `apps/api/src/generated/` est ignoré par git : `prisma generate` échoue, donc ni
> typecheck API, ni tests API, ni **intégration**, ni build API. Ni PostgreSQL ni
> navigateurs Playwright non plus. **Sept tests d'intégration ont été écrits et
> JAMAIS exécutés** — deux pour D135, cinq pour D145/D147. Ils sont le seul endroit
> qui prouve ces contrats côté serveur.


## Session du 28/08/2026 — D265 · B7, variables locales · a11y · lisibilité e2e

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D264**.

| Objet | État |
|---|---|
| B7 — résolution des variables locales sur leur élément réel | ✅ livré |
| B7 — trois gardes sur la table elle-même | ✅ livrées |
| `neutralisation/neutralize-b7.py` | ✅ 3 cibles — ⚠ **non exécuté ici** |
| `a11y.json` — deux violations résorbées retirées | ✅ |
| `fetch failed` — cause dépliée, PAS corrigé | ✅ instrumenté |

Typecheck e2e **0 erreur**, lint e2e **0**. ⛔ **Playwright n'est pas exécutable
dans mon environnement** (CDN des navigateurs hors liste blanche) : tout ce lot
est vérifié par typecheck, lint et lecture — pas par un run.

### D265 — `--hm-gutter` : artefact de mesure, DÉMONTRÉ

La ligne du run se lit en trois signes : `(absent)` à gauche, une flèche, **rien**
à droite. Ce n'est pas « valeur vide en CSS », c'est `getPropertyValue` qui rend
`""` **parce que la propriété n'existe pas sur l'élément interrogé**.

Mesuré par postcss sur les **trois** feuilles du dépôt : `packages/ui/styles.css`
**0** variable hors `:root`, `apps/pro/src/theme.css` **0**, et
`apps/client/src/app/theme.css` **une seule** — `--hm-gutter`, déclarée sur `.hm`
(`clamp(18px, 5vw, 80px)`), consommée par `.hm-hero` et `.hm-section`.
`<main className="hm">` existe bien sur `/fr` (`home-view.tsx` l. 99).
**Le CSS est sain. Le défaut était dans le harnais.**

⛔ **ET IL ÉTAIT PIRE QUE LE FAUX POSITIF.** B7 enregistrait `""` comme une
valeur : `--hm-gutter` pouvait passer de `clamp(18px, 5vw, 80px)` à `0` en
restant **VERT**, puisque la racine rendait `""` dans les deux cas. Un test vert
qui ne mesure rien. Le faux positif n'était que le symptôme visible.

### D265 — la correction, et les trois gardes qui l'empêchent de pourrir

Table explicite `surface → sélecteur → variables` (décision Ko : pas de
déduction automatique des sélecteurs — une heuristique sur `:hover`, `>`,
`:not()` et les media queries devrait elle-même être testée). Clés préfixées :
`.hm --hm-gutter`, pour que deux éléments portant la même variable ne s'écrasent
pas dans le relevé.

Une table de trois lignes se périme en silence. Trois gardes l'en empêchent :

1. **Présence** — sélecteur introuvable ⇒ rouge. Une classe renommée rendrait
   la mesure muette au lieu de rouge.
2. **Valeur** — variable vide sur son propre élément ⇒ rouge. Ici, le vide
   signifie « table périmée », pas « valeur vide ».
3. ⛔ **Couverture** — toute variable déclarée dans la feuille qui **ne résout
   pas à la racine** est locale par définition ; si elle n'est pas dans la
   table, **personne ne la mesure** ⇒ rouge, avec le message qui interdit
   explicitement de la déplacer vers `:root` pour faire taire l'alerte.

⚠ Les listes vides de `pro-light` / `pro-dark` sont **volontaires et mesurées**,
pas oubliées — et la garde (3) le prouvera si cela change.

⚠ **Aucune valeur vide n'entre plus dans le relevé** : un token qui ne résout
pas à la racine est écarté au lieu d'être enregistré comme mesuré.

### D265 — `TypeError: fetch failed` : NOMMÉ, PAS CORRIGÉ

⛔ **ON NE CORRIGE PAS UNE PANNE QU'ON N'A PAS NOMMÉE.** `fetch` de Node est une
enveloppe : la vraie erreur est dans `.cause`. `ECONNREFUSED` (serveur mort),
`ECONNRESET` / `UND_ERR_SOCKET` (socket keep-alive fermée côté serveur pendant
que le client la réutilise) et `UND_ERR_HEADERS_TIMEOUT` portent **le même
texte** et appellent **trois corrections différentes**.

⚠ **L'indice le plus fort est une ASYMÉTRIE DE TRANSPORT, pas un serveur mort.**
Dans `harness.ts`, `createVerifiedAccount` utilise le `fetch` global de Node
(undici) ; `loginContext` utilise `context.request` de Playwright. **Seul
`register` échoue.** Si l'API tombait, `login`, les `page.goto` et la sonde
`webServer` (`/api/v1/health`, qui conditionne le démarrage) tomberaient aussi.

Hypothèse de tête : **course keep-alive**. Le serveur Node ferme une socket
inactive au bout de 5 s ; undici la garde plus longtemps et peut émettre une
requête sur une socket que le serveur ferme au même instant. Le profil colle :
les appels `register` sont séparés par de longues interactions navigateur, donc
la socket est **toujours** périmée. ⚠ **Ce ne serait alors PAS spécifique à la
machine de Ko** — ce serait instable en intégration continue aussi.

Seconde piste, à écarter par lecture des journaux : `"dev": "nest start --watch"`
— tout redémarrage du serveur pendant la suite casse les requêtes en vol.

Instrumentation livrée : chaîne des causes dépliée, durée mesurée, échéance
explicite à 30 s. ⚠ **Aucune nouvelle tentative** : `playwright.config.ts` pose
`retries: 0` avec un motif écrit, et réessayer en douce dans le harnais
contournerait cette décision par la petite porte.

### D265 — deux violations d'accessibilité RÉSORBÉES

`pro nouvelle salle` : `color-contrast @ h2` et `@ p` retirés de
`e2e/baselines/a11y.json`. ⚠ **Retrait, pas ajout** — la référence rétrécit.

⚠ **Découverte en la lisant** : `.filters-reset` et `.range-value` — deux des
cinq textes en accent rapportés en D264 — **sont DÉJÀ dans la référence**, sous
`client recherche de salles`, tolérés depuis le premier run. Elles ne feront
donc pas rougir l'étape 3 : elles sont gelées. Mais `--accent-text` les rend
maintenant **corrigeables**, et leur retrait de la référence serait un gain net.
`.results-count-n` et `.wz-eyebrow`, eux, n'y figurent pas.


## Session du 28/08/2026 — D264 · B8, `--accent-text`

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D263**.

| Objet | Décision | État |
|---|---|---|
| Token sémantique `--accent-text` | **D264** | ✅ créé, clair + sombre |
| `.hm-eyebrow`, `.hm-step-n`, `.venue-card-price` | D264 | ✅ corrigés |
| Cinq AUTRES textes en accent | D264 | ⛔ **MESURÉS, NON CORRIGÉS** — hors périmètre validé |
| Référence B7 | D264 | ⛔ **PAS régénérée** — voir pourquoi |

Un seul fichier modifié : `apps/client/src/app/theme.css`. Client **287 / 20**,
inchangés. CSS reparsé par postcss : valide, cascade vérifiée, **exactement
trois consommateurs** du nouveau token.

### D264 — la règle existait, elle vivait dans un commentaire

⛔ **`theme.css` DISAIT DÉJÀ, EN TÊTE, que `#DA3642` ne passe en texte que sur
blanc pur.** Elle a quand même été enfreinte trois fois. ⚠ **Un commentaire ne
rougit pas** : tant que la règle n'a pas de token qui la porte, elle n'est pas
opposable — n'importe quel `color: var(--accent)` la contourne sans rien casser.
C'est la même leçon que D263 sur l'exemption eslint : une règle non instrumentée
n'est pas une garde.

Mesuré (WCAG 2.x, luminance relative) :

| fond | `--accent` `#da3642` | `--accent-text` `#b32c36` |
|---|---|---|
| `--surface` `#ffffff` | 4,58:1 passe | 6,31:1 passe |
| `--bg` `#fafafa` | **4,39:1 ÉCHEC** | 6,04:1 passe |
| `--bg-2` `#f4f4f5` | **4,16:1 ÉCHEC** | 5,74:1 passe |

⚠ Et `body` porte `background: var(--bg)` : **tout conteneur sans fond propre
est posé sur `#fafafa`**. La règle « accent en texte » n'était donc tenable
nulle part hors des surfaces blanches. La marge sur blanc pur elle-même n'est
que de **0,08** — elle n'aurait pas survécu au premier ajustement de teinte.

⛔ **CE N'EST PAS UNE RÉGRESSION DU CHANTIER `.zj-*`.** L'attribution était
suggérée ; l'arithmétique la refuse. Les trois sélecteurs sont du CSS Client et
échouaient dès que leur conteneur n'était pas blanc.

### D264 — pourquoi un token neuf et non `var(--accent-strong)`

Les deux valent `#b32c36` **aujourd'hui, par coïncidence**. `--accent-strong`
est la couleur de **SURVOL/ACTIF** (D64). Lui faire porter aussi le contraste du
texte, c'est garantir qu'un ajustement de survol déplacera un jour une
conformité AA sans que rien ne le signale. **Un token, un rôle.**

En sombre, `--dark-accent-text` **dérive** de `--dark-accent` — mesuré : #E07A84
rend 6,55:1 / 5,91:1 / 5,32:1 sur les trois fonds, l'accent sombre EST déjà
lisible en texte (D64). Dérivé et non recopié : une valeur en dur cesserait de
suivre l'accent au premier ajustement.

### D264 — CINQ AUTRES textes en accent, mesurés, NON corrigés

⛔ **B8 s'est arrêté au premier écran : onze de ses tests n'ont pas tourné.**
L'audit statique de `theme.css` trouve **cinq autres `color: var(--accent)`** sur
du texte, toutes posées sur `#fafafa` ou `#f4f4f5` :

| sélecteur | ligne | taille | fond | rapport |
|---|---|---|---|---|
| `.filters-reset` | 104 | 12 px | `--bg-2` (`.filters`) | **4,16:1** |
| `.range-value` | 194 | 13 px | `--bg-2` (`.filters`) | **4,16:1** |
| `.results-count-n` | 395 | hérité | `--bg` | **4,39:1** |
| `.wz-eyebrow` | 1270 | 12 px | `--bg` | **4,39:1** |
| `.locale-switch:hover` | 68, 298 | hérité | `--surface` | 4,58:1 — passe |

⚠ **Hors du périmètre validé** (trois sélecteurs nommés), donc non touchées. Mais
elles feront très probablement rougir l'étape 3 dès que les onze tests masqués
tourneront. Un mot suffit à les replier dans un lot B8-bis.

⚠ **`.venue-card-fav` reste en `--accent`** : c'est une icône, pas du texte —
seuil composant 3:1, largement tenu. Les huit `border-color: var(--accent)`
aussi.

⚠ **Report** : `.locale-switch:hover` est déclaré DEUX FOIS à l'identique
(l. 68 et l. 298). Sans effet, mais deux endroits pour une même règle.

### D264 — la référence B7 n'est PAS régénérée, et c'est délibéré

Ajouter `--accent-text` à `:root` fera rougir B7 avec
`--accent-text: (absent) → #b32c36` en clair et `→ #e07a84` en sombre. **C'est
attendu et légitime.**

⛔ **Mais la régénérer MAINTENANT figerait l'angle mort des variables locales**
— la référence enregistrerait au passage `--hm-gutter: ""` comme si c'était une
mesure. La régénération doit venir **APRÈS** le correctif du harnais B7, pas
avant. Ordre imposé, pas préférence.


## Session du 28/08/2026 — D263 · L1, la porte lint

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D262**.

| Tranche | Décisions | État |
|---|---|---|
| L1 — trois imports morts + une directive inerte | **D263** | ✅ livré, `eslint` **sortie 0** |
| Littéral `"PENDING"` sur le chemin de l'argent | D263 | ⛔ **MESURÉ, NON CORRIGÉ** — arbitrage |
| Règles eslint à information de types | D263 | ⛔ **jamais activées** — report |

Portes : lint **0 problème** (3 erreurs + 1 avertissement avant) · unitaires
**638 / 55**, inchangés · harnais S11-a **18/18**, rejoué · typecheck : aucune
erreur nouvelle sur les fichiers touchés (bruit de talon stable à 151).

### D263 — les trois imports n'étaient PAS équivalents

⛔ **`BookingStatus` était un FOSSILE QUI DÉSIGNAIT UN DÉFAUT.** Avant S10b-2, la
conversion devis → demande écrivait le statut depuis l'énumération partagée, dans
`quotes.service.ts`. S10b-2 a déplacé la transaction dans
`quote-store.prisma.ts` — et la valeur y est devenue **une chaîne littérale**.
L'import est resté derrière, sans consommateur ; `eslint` l'a signalé comme mort.
Il l'était. Mais **le supprimer sans rien dire aurait effacé le dernier panneau
indicateur d'un défaut ouvert sur le chemin de l'argent.**

**Mesuré** : le littéral « PENDING » est écrit **TROIS FOIS**, et aucune des trois
ne dérive de `BookingStatus` —
`quote-store.prisma.ts` l. 140, `quote-store.prisma.spec.ts` l. 254,
`quotes.int-spec.ts` l. 449. ⛔ **Les trois s'accorderaient entre elles et se
tromperaient ensemble** : c'est la classe que **D259** a nommée sur
`BookingSource`, et le contraire exact de la règle « on compare à l'AUTORITÉ,
jamais à une liste écrite dans le test ».

**Non corrigé, et c'est délibéré** : chemin de l'argent ⇒ arbitrage avant code.
Le défaut est nommé **à l'endroit où il vit** (commentaire sur
`convertirEnDemande`, aucun changement de comportement) et au backlog.

⚠ Les deux autres (`QUOTE_SELECT`, `DevisChiffre`) sont des résidus de S10b-1 —
vérifié, leurs seuls consommateurs sont `quote-store.types.ts`,
`quote-store.prisma.ts` et son spec. **Morts pour de bon**, eux.

### D263 — la directive `eslint-disable` faisait taire un SILENCE

`domain-events.spec.ts` l. 122 exemptait `@typescript-eslint/only-throw-error`
sur un `throw "chaîne"` volontaire. ⛔ **Mesuré : cette règle n'a jamais tourné.**
Elle demande l'information de types, et `packages/config/eslint/base.mjs`
n'active que `tseslint.configs.recommended` — pas `recommendedTypeChecked`.

⚠ **La conséquence dépasse cette ligne.** AUCUNE règle typée n'est active dans
ce dépôt : ni `no-floating-promises`, ni `await-thenable`, ni
`no-misused-promises`. Sur une base NestJS pleine d'`async` et de
`$transaction`, **`no-floating-promises` est celle qui compte** — une promesse
non attendue sur le chemin de l'argent ne se voit dans aucun test. Report au
backlog : les activer allumerait tout le dépôt d'un coup, c'est un lot en soi.

Directive retirée **par écrit**, avec le motif posé sur place et l'indication de
où reposer une exemption le jour où les règles typées seront activées.


## Session du 28/08/2026 — D261 · S11-a (SRP sur `BookingsService`, moitié amont)

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D260**.

### Où en est le code, en une lecture

| Tranche | Décisions | État |
|---|---|---|
| S11-a — recevabilité extraite en module pur | **D261** | ✅ livré, **16/16** |
| S11-a — charge utile de notification extraite | D261 | ✅ livré, comprise dans les 16 |
| S11-a — porte typecheck cassée à la livraison | **D262** | ⛔ **défaut LIVRÉ**, corrigé |
| S11-b — chiffrage (chemin de l'argent) | — | ⛔ non commencé, cadrage exigé |

Compteurs après ce lot : API **638 / 55** (base d'entrée **602 / 53**, relevée
AVANT de toucher au code pour que le « +36 » mesure quelque chose).
Harnais : **19 scripts, 167 cibles**.

⛔ **CE LOT A ÉTÉ LIVRÉ UNE PREMIÈRE FOIS AVEC LA PORTE TYPECHECK ROUGE** — voir
D262. La correction n'a touché **qu'un seul fichier de test** ; le code de
production n'a pas bougé.

### D261 — ce qui a commandé le découpage : l'ABSENCE de spec unitaire

⛔ **`BookingsService` n'a AUCUNE spec unitaire.** Mesuré : aucun fichier du
dépôt n'instancie cette classe hors `bookings.int-spec.ts`, qui demande un
PostgreSQL réel. Toute cible de neutralisation posée DANS ce service aurait
donc été **muette par construction**, exactement le défaut nommé pendant la
campagne S8→S10b.

Deux issues possibles, une seule tenable :

- lui écrire un spec unitaire — mais son constructeur prend `PrismaService`,
  dont les délégués sont des génériques surchargés : il aurait fallu un
  **septième `as unknown as PrismaService`**, alors que D258 a nommé les six
  restants comme LE défaut chiffrable ;
- **extraire les décisions dans des modules PURS**, qui se mesurent sans double
  et se neutralisent en millisecondes.

C'est la seconde qui a été prise. Le gain de S11-a n'est donc pas la taille,
c'est la **mesurabilité** — et c'est ce qu'il faut lire dans les chiffres.

### D261 — mesures AVANT / APRÈS, relevées, pas estimées

| Grandeur | Avant | Après |
|---|---|---|
| `create` — lignes | 189 (l. 131→319) | **168** |
| `create` — lignes exécutables | 136 | **123** |
| `bookings.service.ts` — lignes | 729 | 715 |
| `bookings.service.ts` — exécutables | 495 | 461 |
| accès `this.prisma.` dans le service | 12 | **12, inchangé** |

⚠ **Le backlog annonçait « 200 lignes sur 729 » ; la mesure dit 189.** L'écart
n'est pas grave, mais il est réel : le chiffre venait d'une estimation, pas
d'un comptage. Corrigé ici pour que S11-b parte d'une base vraie.

⚠ **PREMIER JET : `create` avait GROSSI.** L'appel au module de recevabilité,
écrit en ligne dans `create` avec ses deux traductions HTTP, pesait 138 lignes
exécutables contre 136 avant — le lot ratait son objet en le mesurant. La
traduction du verdict est passée dans une aide privée `admitOrThrow`, **même
idiome que `transitionStatus` juste au-dessus**, et `create` est descendu à 123.
⛔ **Sans la mesure après coup, ce lot aurait été livré en annonçant un
allègement qu'il ne produisait pas.**

⚠ **Le nombre d'accès Prisma n'a PAS bougé, et c'est voulu.** D258 a établi
qu'un port ne se justifie pas par un compte d'imports Prisma. S11-a ne touche
pas à la persistance.

### D261 — les trois refus préalables : `booking-admission.ts`

Sortis de `create` : créneau introuvable, capacité dépassée, date hors fenêtre.
Module pur, verdict discriminé (`ADMITTED` / `SLOT_UNAVAILABLE` /
`GUESTS_EXCEED_CAPACITY`), le service traduisant seul en HTTP — même partage
que `booking-transitions.ts` (S3).

⛔ **L'ORDRE DES REFUS EST UNE RÈGLE, ET RIEN NE LE MESURAIT.** Relevé sur le
fichier avant déplacement : créneau l. 178, **capacité l. 180**, **date l. 196**.
Le service traduit la capacité en **400** et les deux autres en **409**.
Intervertir ferait répondre « ce créneau n'est pas disponible » à une demande
dont le seul tort est de compter trop d'invités : le client changerait de DATE
au lieu de réduire sa table, indéfiniment. Trois tests mesurent désormais cet
ordre sur des demandes **doublement fautives** ; c'est la garde que le lot
ajoute, pas seulement déplace.

⚠ **DEUX `null` SE CROISENT DANS CE MODULE.** `slot === null` veut dire
« introuvable » et refuse ; le `null` que `computeBookingWindow` attend veut
dire « ignore les heures » et réserve la journée (SINGLE_SLOT, D77). Les
confondre coûterait un jour de calendrier sur une salle qui ne prend qu'une
réservation par jour. Le mode voyage donc dans un **drapeau distinct**
(`wholeDay`), jamais encodé par un créneau absent.

⚠ **LE CRÉNEAU EST REPORTÉ DANS LE VERDICT**, via un paramètre de type. Sans
lui, `create` devrait relire le créneau dans `venue` et y **réécrire la garde
de nullité que le module vient de rendre** — c'est-à-dire garder un `if` dont
plus aucune branche ne se déclenche. Une garde sans objet se retire.

### D261 — la charge utile : `booking-notification-input.ts`

⛔ **PAS DANS `booking-notifications.service.ts`, ET C'EST D63 QUI L'INTERDIT.**
Le backlog proposait de l'y mettre, « puisqu'il consomme déjà ce que les deux
aides construisent ». Vérifié : l'y mettre aurait obligé `BookingsService` à
**injecter le service de notification** pour construire sa charge, donc à
défaire D63 — le service publie un FAIT et ne connaît plus ses destinataires.
Un module pur entre les deux les laisse chacun à sa place. ⚠ **Une consigne
qui s'appuie sur un existant demande de mesurer cet existant** (D231).

Cette construction porte **deux montants** et **deux téléphones** — quatre
valeurs interchangeables deux à deux, dont **aucune interversion ne casse le
typage**. Elle n'avait jamais été mesurée.

⚠ **`civilOf` A CHANGÉ DE MAISON, PAS DE CORPS.** Cette conversion privée avait
DEUX appelants dans `bookings.service.ts` (`toDTO` et la charge). L'un partant,
en garder une copie de chaque côté aurait fabriqué **deux autorités sur la même
conversion**. Elle devient `civilOfUtcDate` dans `availability-time.ts`, module
qui possède déjà `CivilDate` et sa conversion aller.

⚠ **LA GARDE DE FUSEAU N'EXISTAIT NULLE PART.** `Booking.eventDate` est une
`@db.Date`, rendue à minuit UTC ; lue avec `getFullYear()`, elle recule d'un
jour à l'ouest de Greenwich — et **reste invisible sur un serveur en UTC**,
c'est-à-dire en intégration. La spec **épingle `process.env.TZ` à
`America/Toronto`** et le restaure ensuite. Mesuré : `process.env.TZ` posé à
chaud est bien pris en compte par Node 22.

### D261 — deux gardes de SOURCE, et pourquoi il en fallait

Rien n'empêche la décision de **revenir** dans le service six mois plus tard :
il y aurait alors deux autorités sur la fenêtre de réservation, et une seule
mesurée. `booking-admission.spec.ts` lit donc `bookings.service.ts` et vérifie
que la constante d'horizon n'y apparaît plus et que le module est bien appelé.

⚠ **LA PREMIÈRE RÉDACTION A FAIT ROUGIR CETTE GARDE SUR UN COMMENTAIRE.** Le
commentaire qui explique pourquoi l'import a disparu **épelait le nom de la
constante**. Reformulé en toutes lettres, avec la raison écrite sur place :
une garde qui accuse à tort finit ignorée.

### D261 — un attendu écrit de mémoire, attrapé par la mesure

Le test du nom client annonçait `"Yasmine  Belkacem"` (deux espaces). La mesure
a rendu **trois** : le prénom de la fixture en porte déjà deux à droite, le
gabarit en ajoute un, et **`trim()` ne touche que les BORDS**. Attendu corrigé
sur la mesure. ⚠ Conséquence rapportée, non corrigée : un nom de client peut
sortir de cette charge avec des **espaces intérieurs**.

### Campagne de neutralisation

`neutralisation/neutralize-s11a.py` — **16 cibles, 16 mordues**, deux mesures
unitaires toujours actives (aucune cible ne peut être comptée mordue sans avoir
été lancée, D253). ⛔ **Aucune cible ne repose sur le typecheck** : en bac à
sable le talon Prisma rend les types lâches, une telle cible serait muette.

### D262 — « NON MESURÉ » N'EST PAS « NON LANÇABLE ». Correctif S11-a-1.

⛔ **L'archive S11-a est partie avec la porte typecheck ROUGE.** Ko a mesuré,
chez lui, **une seule erreur** :
`booking-admission.spec.ts(157,42): TS2339: Property 'nameFr' does not exist on
type 'SlotBounds'`.

**Cause technique.** L'aide de test typait ses surcharges par
`Partial<Parameters<typeof decideBookingAdmission>[0]>`. ⛔ **`Parameters<>` sur
une fonction GÉNÉRIQUE efface le paramètre de type et le remplace par sa
CONTRAINTE** : `S` devenait `SlotBounds`, l'aide rendait
`BookingAdmission<SlotBounds>`, et l'assertion qui prouve justement que le
créneau traverse le verdict ne compilait plus. Corrigé en nommant le type
concret et en utilisant `BookingAdmissionInput<S>`, que le module **exporte
déjà** : on nomme le contrat, on ne le reconstruit pas depuis la signature.

**Cause de méthode — la vraie.** L'erreur était **présente dans le bac à sable
depuis le début**, à la ligne 157, noyée dans **586** erreurs induites par le
talon Prisma. Je ne l'ai pas vue parce que **je n'ai pas lancé `tsc` du tout** :
le raisonnement « le typecheck est non mesuré » (vrai des FORMES Prisma) a été
étendu sans le dire en « le typecheck ne dit rien » (faux). ⛔ **Un outil qu'on
déclare non concluant sur un point se lance quand même, puis on trie.**

**Ce qui change, mesuré :**

1. **Talon renforcé** — un index de délégués sur `PrismaClient` fait tomber le
   bruit de **586 à 151** erreurs. Le talon n'est pas livré (`.gitignore`
   l. 10) mais la recette est ici.
2. **Mesure `types` restreinte** — `tsc --noEmit` sur les **trois fichiers du
   lot qui n'importent RIEN de Prisma** rend **zéro erreur** et rendait
   **exactement une** avant correction : celle de Ko, sans aucun bruit. Options
   recopiées de `packages/config/tsconfig/base.json` et `apps/api/tsconfig.json`,
   pas écrites de mémoire — un typecheck restreint plus PERMISSIF que la porte
   réelle mentirait dans le sens le plus coûteux.
   ⚠ `booking-notification-input.ts` en est **absent** : il importe `BookingRow`,
   donc son typecheck dépend du client généré. Dit, pas caché.
3. **Deux cibles de neutralisation que SEUL `tsc` voit** (S11a-17, S11a-18).
   ⚠ **Vérifié, pas affirmé** : sous la mutation 17, `vitest` reste **15/15
   VERT** — rien ne change à l'exécution, seul le type perd `nameFr`. C'est
   exactement par ce trou que le défaut est parti en livraison.

⚠ **Ce que confirme la mesure de Ko** : les erreurs `SlotBounds` que le bac à
sable montre encore dans `bookings.service.ts` sont des **artefacts de talon**.
Chez lui, `venue` est une vraie charge Prisma, `S` s'infère, et **aucune** de
ces lignes n'est signalée. La porte réelle n'accusait qu'un seul fichier.

⛔ **Et la porte lint était rouge AVANT S11-a** : la sortie de Ko le confirme —
les trois erreurs sont dans `quotes.service.ts`, aucune dans les fichiers du
lot, dont `eslint` sort en **0**. Voir le backlog.

### Ce qui reste ouvert à la clôture

- **S11-b — le chiffrage** : tarification, prestations, confrontation D75,
  acompte. **CHEMIN DE L'ARGENT** : cadrage avec modes de défaillance écrits
  AVANT tout code. Non commencé.
- ⛔ **LA PORTE LINT ÉTAIT DÉJÀ ROUGE À L'ENTRÉE** — voir le backlog.
- ⛔ **`AGENTS.md` DU DÉPÔT ÉTAIT PÉRIMÉ** — voir le backlog.
- Les reports de la session précédente sont inchangés : E3d-2, `PROCESSING`,
  `migration-non-empty.int-spec.ts`, `password.service.spec.ts`.


## Session du 24 au 28/08/2026 — D252 à D260 · campagne DIP/ISP/SRP (S8→S10b)

⛔ **Numéros pris en LISANT ce fichier** : le dernier attribué était **D251**.
La collision D233/D249 de la session précédente venait d'avoir suivi un résumé ;
la règle a été appliquée cette fois.

### Où en est le code, en une lecture

| Tranche | Décisions | État |
|---|---|---|
| Typecheck API rouge (`getResponse`) | **D252** | ✅ livré, reproduit puis corrigé |
| Cible de harnais sans mesure comptée mordue | **D253** | ✅ livré, 4 harnais corrigés |
| Paliers de budget — autorité unique | **D254** | ✅ livré, `neutralize-maxprice` **10/10** |
| Atomicité du paiement — cadrage | **D255** | ✅ cadré · E3d-1 livré, E3d-2 reporté |
| E3d-1 — index partiel `PENDING` | D255 | ✅ livré, **8/8** |
| S8 — plafonds d'avertissements à cliquet | **D256** | ✅ livré, relevé fait |
| S9 — ISP sur `VenueProClient` | **D257** | ✅ livré, **6/6** |
| S10 — la frontière DIP | **D258** | ✅ cadré |
| S10a — ports `VenueStore` / `ReferentielsExistence` | D258 | ✅ livré, **13/13** |
| S10b-1 — cycle de vie du devis | D258 | ✅ livré |
| S10b-2 — conversion (chemin de l'argent) | D258 | ✅ livré, **20/20** avec S10b-1 |
| `BookingSource` absent des énumérations partagées | **D259** | ✅ livré |
| D163 — motif périmé | **D260** | ✅ corrigé (motif, pas décision) |
| S11 — SRP sur `BookingsService` | — | ⛔ mesuré et proposé, **non livré** |

Compteurs après cette session : API **602 / 53** · api-client **36 / 3** ·
client **287 / 20** · pro **347 / 28** · intégration **432 / 35**.
Harnais : **18 scripts, 149 cibles**, tous en `neutralisation/`.

### D252 — une INTERSECTION sur l'objet, pas sur le résultat de l'appel

`(e as BadRequestException & { getResponse(): { code?: string } })` : les deux
membres déclarent `getResponse`, TypeScript en fait une **liste de surcharges**
et retient la première — celle de Nest, qui rend `string | object`. Le membre
ajouté est mort-né, `.code` tombe en `TS2339`.

⚠ **Le typecheck était rouge pendant que les 560 tests passaient.** On caste le
RÉSULTAT de l'appel, jamais l'objet qui le porte — forme déjà employée dix-huit
lignes plus haut dans le même fichier.

### D253 — une cible de neutralisation SANS MESURE était comptée MORDUE

Dans `neutralize-solid-s6.py`, quatre cibles sur six n'ont que des mesures
d'intégration. Sans `--int`, leur liste de mesures est vide, `codes` est vide,
donc `verts` est vide, donc la branche « mordue » s'exécutait. **Le script
annonçait « 6 gardes rouges » alors que deux avaient été mesurées**, et sortait
en 0.

Mesuré en rejouant `main()` avec `lancer` bouchonné : 6 annoncées / 2 lancées.
Corrigé dans les quatre harnais portant ce construct, avec un **code de sortie 3
= CAMPAGNE INCOMPLÈTE** — un résultat partiel ne peut plus se recopier en
« n/n ».

⚠ **Conséquence sur l'historique** : `S6 · D246 · ✅ 6/6` est à lire **2/6
mesurées** si la campagne n'a pas été lancée avec `--int`.

### D254 — les paliers de budget : une seule autorité, tous sous la butée

Le même montant était déclaré **trois fois dans deux unités** : `BUDGET_CEILING`
en dinars, le `<select>` de l'accueil en dinars, `BUDGET_TIERS` de l'assistant en
**centimes**. Deux des quatre paliers valaient 2 000 000 et 4 000 000 DA, soit
au-dessus de la butée : par D69 ils signifiaient « pas de plafond », donc ils ne
filtraient **rien**. L'assistant poussait une querystring **vide** après quatre
écrans.

**Arbitrage Ko** : option (a), trois paliers — **500 000 / 750 000 / 1 000 000**,
tous strictement sous 1 500 000. Valeurs rondes délibérément **non calées sur le
jeu de démonstration** (390 000–940 000 sont des chiffres inventés pour peupler
un écran, pas une mesure du marché).

`BUDGET_TIERS` vit désormais dans `search-query.ts`, en dinars. `centsFromDinars`
devient le **seul endroit du front qui multiplie par 100**, en regard de
`dinarsFromCents` qui divise. Une garde fait tomber tout palier `>= BUDGET_CEILING` :
le commentaire d'avertissement qui existait dans `home-view.tsx` avait vécu toute
la durée du défaut sans rien empêcher.

⚠ **Divergence latente refermée** : sur les paliers hauts, le compteur de
l'assistant demandait `lte 200000000` pendant que la page de résultats, plafond
effacé par la butée, n'en demandait aucun. *Deux écrans, deux vérités*, invisible
tant qu'aucune salle ne coûtait plus que le palier.

### D255 — atomicité de l'intention de paiement : la base, pas un verrou

**Arbitrage Ko** : contrainte en base — un index unique partiel
`UNIQUE (booking_id) WHERE status = 'PENDING'`. Un verrou applicatif ne survit ni
à un crash ni à un déploiement multi-instance, qui est l'état **normal** d'une API.

⚠ **Une condition préalable annoncée était FAUSSE.** J'avais écrit que l'index
échangeait une course contre un blocage tant que les `PENDING` ne meurent pas.
Mesuré : `findFirst` rend le `PENDING` **quel que soit son âge** — le blocage
existait déjà, à l'identique. L'index et l'expiration sont donc **décorrélés**, et
E3d-1 est parti seul.

**Expiration (E3d-2) : 30 minutes, sous condition.** La durée vient du dépôt, pas
d'une référence extérieure : `AUTH.PASSWORD_RESET_TTL_MINUTES` vaut 30 et c'est
l'analogue exact (jeton à usage unique, visiteur devant son écran). ⛔ **À ne pas
confondre avec `PAYMENT_WINDOW_HOURS = 48`** : l'une borne UNE TENTATIVE, l'autre
LE DROIT DE PAYER. Les intervertir casse le produit dans les deux sens.

⛔ **Le nombre n'est pas figé** : si l'expiration est plus courte que la durée de
vie d'un lien Chargily, un visiteur paie une intention marquée morte — argent
orphelin. Cette durée n'est pas mesurée (`PAYMENTS_ENABLED=false`). Tranché **au
branchement de Chargily**, avec une assertion qui tombe si le rapport s'inverse.

⚠ `PROCESSING` existe dans l'énumération mais n'est écrit nulle part : l'index ne
le couvre pas. Ce n'est pas une régression (`findFirst` ne regardait déjà que
`PENDING`) mais c'est une **décision produit à part**, non prise.

### D256 — les plafonds d'avertissements : un PLAFOND, pas une égalité

La liste `EXEMPTES` portait un compte en toutes lettres que **rien ne vérifiait** :
un fichier exempté pouvait passer de 38 à 380 sans un bruit.

Première version livrée : cliquet à deux sens — dépasser fait tomber, **et passer
en dessous aussi**, pour qu'un progrès soit enregistré. ⛔ **C'était faux ici.**
`services-section.test.tsx` a produit 1 avertissement au relevé et 0 au run
suivant, sans qu'une ligne du dépôt ait bougé : un `act(…)` tardif tombe avant ou
après la fin du test selon l'ordre des microtâches. Une égalité stricte sur une
mesure qui flotte, c'est une suite qui rougit au hasard — et une garde à laquelle
plus personne ne croit est la maladie que ce lot devait soigner.

⚠ **L'erreur de fond** : j'ai copié la forme du cliquet a11y sans son fondement.
`b8-accessibility.e2e.ts` gèle des **signatures**, déterministes pour un DOM
donné ; j'ai transposé les deux sens sur un **compte**, qui ne l'est pas.

Retenu : dépasser fait tomber, descendre s'imprime. ⚠ **Un plafond se relève sur
plusieurs passes** : `venue-wizard.test.tsx` est passé de 3 à 4 sans qu'on le
touche, et le plafond est désormais au **maximum observé**.

⛔ **Un relevé ne sort plus jamais en vert.** Sous `UPDATE_CONSOLE_CEILINGS=1`, la
garde est **entièrement désactivée** — `afterEach` sort avant son `throw`,
`afterAll` avant toute vérification. Une variable restée dans le shell rendait
donc toutes les portes suivantes vertes **sans rien mesurer** ; vécu le
25/08/2026. Le relevé lève maintenant, et le harnais porte un **pré-vol inversé**
qui abandonne si un run de relevé sort en 0.

### D257 — ISP : six interfaces là où il y en avait une de vingt-deux membres

Le défaut n'était pas « vingt-deux méthodes » : c'est que **chaque écran en
recevait vingt-deux pour en employer entre un et cinq**. Mesuré sur les quatorze
consommateurs — aucun n'en emploie plus de cinq.

`VenueCrudClient` (5) · `VenueMediaClient` (5) · `VenueSlotTemplateClient` (3) ·
`VenuePricingRuleClient` (3) · `VenueAvailabilityClient` (4) · `VenueVisitClient` (2).
`VenueProClient` subsiste en **intersection** : aucun appelant existant ne bouge.

⚠ **Six familles et non cinq** : je proposais « disponibilité et visites » à six
membres ; la mesure dit qu'aucun écran ne croise les deux. Un regroupement qui ne
suit pas l'usage réel rend six méthodes là où deux suffisent.

⛔ **Ce qui rend l'ISP exécutoire, ce sont les CROCHETS ÉTROITS.** Le découpage
seul ne contraint personne tant que tout le monde appelle `useVenues()`. Deux
gardes muettes l'ont prouvé : **élargir un type de retour ne casse jamais un
appelant** — seul un type rétréci le fait — et un `import { useVenues as … }`
laisse le site d'appel intact. Corrigé par six assertions
`Identiques<ReturnType<…>>` et une garde statique qui cherche **l'identifiant**,
pas l'appel.

### D258 — la frontière DIP est le BLOC TRANSACTIONNEL, pas la lecture

⚠ **La prémisse de l'audit ne survit pas à la mesure.** « 21 services sur 26
importent `PrismaService` » est un **compte, pas un défaut**. Le défaut chiffrable
était ailleurs : **six specs** passaient leur faux Prisma en
`as unknown as PrismaService`, ce qui désactive tout contrôle de type. Le plus
gros, celui d'`auth`, simule `$transaction` par un passe-plat et l'admet
lui-même : *« suffisant pour vérifier QUELS appels composent la rotation »*. **Un
double casté mesure la liste des appels, jamais la décision.**

⚠ **Et le cast n'était pas de la paresse** : les délégués Prisma sont des
génériques surchargés, `vi.fn()` ne leur est pas assignable. Il n'y avait pas
d'autre issue que le cast — ou un port, dont les méthodes sont des fonctions
simples.

**La règle :** un port est justifié si le bloc est transactionnel ou concurrent,
**ou** si un spec existe et son double est casté, **ou** si le collaborateur est
réellement extérieur. **Pas** parce qu'un service importe Prisma.

⛔ **`BookingsService` n'a PAS été porté, et c'est motivé** : il porte **zéro
`$transaction`** — S5b a déplacé ses deux blocs risqués derrière `BookingLocks` —
et ses douze accès restants sont des lectures dont l'écart est **assumé par écrit**
dans `booking-locks.types.ts`. Le faire aurait défait une décision arbitrée sans
défaut mesuré.

**S10a** — `venues.service.ts` : deux ports (`VenueStore` 7 méthodes,
`ReferentielsExistence` 3). ⚠ Sept et non six : `trouverIdVivante` n'est pas un
doublon de commodité — `VENUE_PRO_SELECT` embarque photos, scènes et liaisons, et
fusionner ferait payer ce select à chaque contrôle d'appartenance.
Assertions : 22 → **49** (22 au service, 27 à l'adaptateur), aucune perdue.

**S10b-1** — les quatre transactions du devis, entières, dans l'adaptateur. Le
`ConflictException` sort de la transaction : inoffensif — un refus signifie
`count === 0`, rien n'avait été écrit — mais réel, et dit dans le code.
`QuotesService` a reçu **son premier spec unitaire**.

**S10b-2** — la conversion. Les quatre montants sont **nommés un par un** ; les
lignes de service restent dans la **même requête** que la demande, sinon un total
sans détail. ⛔ **Le refus ne se conclut pas sur un code de driver** : `bookings`
porte DEUX contraintes uniques, et sur P2002 l'adaptateur **relit** — le
diagnostic vient de l'état de la base, pas des entrailles de Prisma.

### D259 — `BookingSource` manquait aux énumérations partagées

Ses trois voisines de la même table y étaient (`BookingMode`, `BookingStatus`,
`PaymentMethod`) ; `BookingSource` avait été oublié à la constitution du fichier,
et chaque écrivain retapait `"WALK_IN"` en chaîne littérale. Le typer en union
littérale dans un port aurait créé une **seconde autorité sur un jeu de valeurs**.

⚠ C'est une instance de la classe que **D237** avait nommée : rien ne compare
`schema.prisma` aux énumérations partagées. Un test qui les diffe fermerait la
classe entière.

### D260 — D163 : le MOTIF corrigé, la décision conservée

Le commentaire affirmait que `Booking.quoteId` référence le devis **sans recopier
les montants**. Mesuré : `convert()` recopie les quatre montants, et **rien** dans
`apps/api/src` ne lit un montant à travers `quoteId`. Écraser un devis ne
toucherait aucune réservation.

La décision tient, pour une raison qu'il fallait dire correctement : **le devis
est le document remis au client**. L'écraser ferait diverger ce que le pro a en
base de ce que le client a en main.

⛔ **Q3 est planifié contre ce commentaire.** Une justification périmée sur le
chemin de l'argent coûte plus cher qu'une absence de justification.

### Ce qui reste ouvert à la clôture

- **E3d-2** — expiration des `PENDING`, bloquée sur la durée de vie d'un lien Chargily.
- **`PROCESSING`** doit-il bloquer comme `PENDING` ? Décision produit non prise.
- **S11** — SRP sur `BookingsService` : mesuré (`create` = **200 lignes sur 729**,
  onze responsabilités), découpage proposé en **S11-a** (notifications +
  recevabilité) et **S11-b** (chiffrage, chemin de l'argent). Non validé, non livré.
- **`migration-non-empty.int-spec.ts`** — `beforeAll` bloqué à 60 000 ms **deux
  fois**, tests SAUTÉS. Ce n'est pas de la lenteur : c'est un `DROP DATABASE` qui
  attend. Un diagnostic a été posé (`statement_timeout`, occupants relevés et
  nommés) mais **la cause n'est pas établie**.
- **`password.service.spec.ts`** — argon2 consomme 3,4 s d'un budget de 5 s au
  repos. Flottement latent, non traité.


## Session des 23 et 24/08/2026 — D249 à D251 · 404 atteignable, `maxPrice`, hors horizon

### ⚠⚠ COLLISION DE NUMÉROTATION, repérée en écrivant ces lignes

Les décisions de cette session ont d'abord été écrites **D233** et **D234** —
numéros DÉJÀ attribués à la campagne SOLID/Strategy des 20–22/08. L'erreur vient
d'avoir repris la numérotation annoncée par un **résumé de session** au lieu de
lire le dernier numéro attribué ICI. Corrigée dans les **sept fichiers livrés**
et dans `neutralize-404.py` ; portes et harnais rejoués après correction.
⛔ **Un numéro de décision se prend en lisant ce fichier, jamais un résumé.**

### Où en est le code, en une lecture

| Tranche | Décisions | État |
|---|---|---|
| 404 réellement atteinte | **D249** | ✅ livré, mesuré sur serveur réel |
| Soft-404 (statut 200 sur les refus) | **D250** | ✅ livré, mesuré des deux côtés |
| Décor de la 404 → image statique | **D251** | ✅ livré, mesuré |
| Correction `maxPrice` | D228 | ✅ **LIVRÉ** — ⚠ défaut B ouvert, voir ci-dessous |
| Refus hors horizon | D227 | ✅ **LIVRÉ** |
| Point B — 404 front | D221 | ⚠ **motif CORRIGÉ par D249**, décision conservée |
| Lot ③ — assistant | D229–D231 | ⛔ toujours non livré |

Compteurs après cette session : client **264 / 19** · API **560 / 50** ·
i18n **1093 = 1093**. Harnais : `neutralize-404.py` **12/12**,
`neutralize-maxprice.py` **8/8**, `neutralize-horizon.py` **6/6**.

---

**D249 — ⛔ LES DEUX PAGES 404 N'ÉTAIENT ATTEINTES PAR PERSONNE.**
Livrées le 19/08, correctes — traduites, dans la charte, deux sorties — et
jamais rendues pour un visiteur. **Deux causes, toutes deux hors du contenu.**

1. **Un nom de fichier.** La page racine s'appelait `_not-found.tsx`. Le routeur
   ne reconnaît qu'une liste **fermée** de noms spéciaux ; ce fichier n'était pas
   une route en erreur, il n'était **pas une route du tout**.
2. **Une frontière imbriquée n'attrape pas ce qui n'apparie rien.**
   `[locale]/not-found.tsx` n'est une frontière que pour un `notFound()` levé
   dans un segment DÉJÀ apparié. Une URL inconnue n'apparie pas `[locale]` :
   Next remontait au 404 racine, c'est-à-dire — vu (1) — à rien.

D'où `[locale]/[...rest]/page.tsx`. ⚠ Son travail n'est PAS d'appeler
`notFound()`, c'est de faire **apparier `[locale]`** pour que le layout localisé
se monte avant. Mesuré avant correction :

```
GET /fr/nimportequoi  → 404 « This page could not be found » (ANGLAIS)
GET /wp-login.php     → 404, corps VIDE
```

**⚠ CORRECTION DU MOTIF DE D221 — la raison écrite était FAUSSE.**
D221 justifiait la page racine par « un chemin dont la LOCALE est invalide
(`/xx/quoi`) ». Ce cas **n'arrive pas** : l'intergiciel de next-intl ne voit pas
`xx` comme une locale invalide, il ne la voit pas comme une locale du tout, et
redirige. Mesuré : `/xx/quoi` → **307** vers `/fr/xx/quoi`. Le `hasLocale(...)`
du layout ne refuse **jamais** rien en production.
La vraie raison est le `matcher` de `middleware.ts`, qui s'exclut des chemins
contenant un point : `/wp-login.php`, `/foo.bar`, `/sitemap.xml` n'obtiennent
aucun préfixe de locale et atterrissent sur la page racine — d'où son
bilinguisme en dur, aucune langue n'ayant été négociée.
⚠ **La DÉCISION est conservée ; c'est son MOTIF qui est remplacé.** Un motif
invalidé se corrige, il ne s'efface pas.

⚠ **Ce qu'un test de rendu n'aurait jamais vu.** Monter le composant et vérifier
qu'il affiche « Cette page n'existe pas » ne mesure pas que quelqu'un l'atteint.
La garde livrée mesure donc des **noms de fichiers** — la seule chose qui avait
cédé. Même famille que D218 et D228.

---

**D250 — ⛔ TOUS LES 404 DU SEGMENT SORTAIENT EN HTTP 200.**
`[locale]/loading.tsx` ouvrait une frontière Suspense au-dessus de **toutes** les
pages du segment, donc au-dessus des deux seules qui peuvent refuser. Next vide
la coquille avant que le refus ne remonte : l'en-tête est déjà parti, le 404 sort
en 200. Mesuré **des deux côtés**, à la ligne près :

```
loading.tsx en [locale]/ → GET /fr/nimportequoi = 200
loading.tsx retiré       → GET /fr/nimportequoi = 404
```

⚠ **CE N'ÉTAIT PAS UN ARBITRAGE, C'ÉTAIT UNE DETTE.** `salles/[slug]/page.tsx`
portait **déjà l'invariant par écrit**, dans son propre fichier : « dans tous ces
cas un 404 HTTP, jamais une page introuvable servie en 200 : un soft-404 se fait
indexer comme une vraie page ». Il n'a jamais été tenu.

**Correction : borner la frontière, pas la supprimer.** Le groupe de routes
`(recherche)` — invisible dans l'URL — la limite à la seule page de liste, celle
qui ne peut pas refuser. ⚠ `salles/loading.tsx` n'aurait pas suffi : il recouvre
`salles/[slug]`, donc la salle dépubliée serait restée en 200 (cible C10).

**Ce que ça coûte, relevé et non supposé** : la fiche de salle n'a plus de
squelette. `getVenueBySlug` est en `revalidate: 300` — la page la plus lue est
servie de cache la plupart du temps ; `searchVenues` est en `no-store`, c'est là
que le serveur attend vraiment, et là que le squelette reste.

Prouvé par une sonde de **forme identique** à `salles/[slug]` (segment dynamique,
`ƒ`, `notFound()` sur identifiant inconnu) : `/existe` → 200, `/inexistante` →
**404**.

⚠ **INVARIANT GÉNÉRAL QUI EN SORT** : *aucune frontière Suspense au-dessus d'une
page qui peut refuser*. La garde relève les pages **dans la source** (celles dont
le `page.tsx` contient `notFound();`) et remonte l'arborescence : une troisième
page qui apprendrait à refuser est couverte le jour où elle est écrite.

---

**D251 — Le décor de la 404 est une IMAGE STATIQUE, pas un nuage engendré.**
Le nuage de mots a d'abord été livré comme un composant qui calculait sa
disposition à chaque rendu : détection de collisions, largeurs imposées par
`textLength`, deux canevas selon l'écran. Ko a **révoqué le raisonnement qui
l'avait motivé** — « texte indexable » est sans objet sur une page en `noindex`
(D216), et un décor ne doit pas être lu à voix haute, il doit sortir de l'arbre
d'accessibilité.

Retiré : le composant, ses 16 tests, quatre cibles de harnais, et cinq règles CSS
sur six. Reste **une image**, `apps/client/public/404-nuage.svg`, posée par
`<img alt="" aria-hidden="true">` en `object-fit: cover`.

⚠ **DES TRACÉS, PAS DU TEXTE, et ce n'est pas un détail.** Une image référencée
par `<img>` est un document **isolé** : elle n'accède ni au CSS de la page ni à
ses polices auto-hébergées. Du `<text>` y retomberait sur une police système —
et sur l'arabe, cela veut dire des lettres **non liées**, illisibles. Le défaut
ne se verrait que sur la moitié arabe du public. Les glyphes sont donc façonnés
par **HarfBuzz**, le moteur des navigateurs, avec les sous-ensembles Readex Pro
du dépôt ; les formes contextuelles sont celles que la police prévoit.

⚠ **LES OPACITÉS SONT GRAVÉES AU NIVEAU DU MODE SOMBRE.** Une image en `<img>`
ne connaît pas le thème de la page : elle ne peut pas s'éclaircir sur fond noir.
On grave donc les valeurs fortes et la page **atténue** en clair (`opacity: .7`).
L'inverse était impossible : `opacity` ne dépasse pas 1.

⚠ **LE TEXTE « 404 » A DISPARU DE L'ÉCRAN**, à la demande : le code vit dans le
statut HTTP, là où les machines le lisent ; à l'écran il ne disait rien que la
phrase ne dise mieux. Une garde vérifie qu'il ne revient pas.

Mesures de l'image : 73 mots, tailles 26→130 px, **0 chevauchement**,
**0 empiètement** sur le vide central, 20 mots du vocabulaire sur 21,
188 ko brut / **27 ko** compressé. Un seul fichier pour tous les écrans ; le vide
central est calibré pour tenir au bureau **comme** sur mobile — sans ce calibrage,
une image unique ne pouvait pas servir les deux.
⚠ Sa **recette complète** (canevas, vide, police, moteur, graine `20260824`) est
écrite dans l'en-tête du fichier : aucun script de génération n'entre au dépôt,
mais l'image n'est pas orpheline.

---

**D227 — ✅ LIVRÉ.** Refus hors horizon, code **distinct**
`AVAILABLE_ON_BEYOND_HORIZON`, une seule lecture d'horloge dont les deux bornes
dérivent, quatrième issue **à plat** sur `SearchOutcome`, `switch` sans `default`
— une cinquième issue fera tomber la compilation. À l'écran : **un panneau, deux
jeux de textes**.
⚠ **Le jour de l'horizon LUI-MÊME est accepté** (`>`, pas `>=`), symétriquement à
aujourd'hui en bas. D55 : écrire la borne avant le cas réel, c'est se donner
raison.
⚠ **La fixture `LOINTAIN = "2099-06-02"` a dû disparaître.** Choisie « très
loin » pour n'être jamais passée, elle est devenue exactement ce qui se refuse et
faisait tomber trois tests qui ne parlaient pas d'horizon. Remplacée par deux
bornes **dérivées** de l'horloge figée et de `BOOKING_HORIZON_MONTHS` — une
chaîne écrite à la main aurait cessé de désigner l'horizon au premier changement
de la constante, en restant verte.
⚠ Correction d'un commentaire faux trouvé en chemin : `search-view.tsx`
justifiait son panneau par « le sélecteur de date ne propose aucune date passée ».
**Aucun sélecteur n'existe** — pas un `type="date"` dans tout `apps/client`.

---

**D228 — ✅ LIVRÉ, avec un SECOND défaut laissé OUVERT.**
La correction du nom est faite : `maxPrice` en priorité, `maxPriceCents` en repli
**jamais dans l'autre sens**, multiples de 100 seulement, reste non nul
**abandonné et non arrondi**, `toPublicQuery` seule à écrire, dette datée au
**19/11/2026** dans le code.
⚠ **La PRÉSENCE de la clé décide de la branche, sa VALIDITÉ décide de la valeur.**
`?maxPrice=` **vide** compte comme présent : un `<form method="get">` soumet ses
champs vides, donc « peu importe » s'écrit comme ça, et replier là
ressusciterait un plafond que le visiteur vient d'effacer.

⚠ **CAUSE STRUCTURELLE, dans l'assistant** : *une seule querystring servait deux
contrats*. Le même objet allait à `countVenues` (API, centimes) **et** à
`router.push("/salles?…")` (URL publique, dinars). Le compteur annonçait le bon
nombre, la page de résultats affichait tout — deux écrans, deux vérités, aucun
test pour les confronter. Un seul assembleur désormais, **une seule ligne de
différence**.

⛔ **DÉFAUT B, TROUVÉ EN MESURANT, NON TRANCHÉ.** `atCeiling` efface tout plafond
`>= BUDGET_CEILING` (1 500 000 DA) — D69, une poignée en butée ne filtre pas. Or
le formulaire d'accueil propose **2 000 000 et 4 000 000 DA**. Même le nom
corrigé, **deux des quatre options ne filtrent rien** — état inchangé, ni recul
ni réparation. Choisir les paliers offerts au visiteur est une **décision
produit** : descendre les paliers sous la butée, relever `BUDGET_CEILING`, ou
assumer que « 4 000 000 DA » veut dire « pas de plafond ».

⚠ **LE TEST VALIDAIT LE DÉFAUT** (famille D219) : `filter-wizard.test.tsx`
assertait `maxPriceCents=100000000` **dans l'URL poussée** — le contrat de l'API
sur une adresse publique. Vert depuis la livraison, sur un budget jeté. Corrigé,
**pas contourné**, et renforcé par le geste qui manquait : l'URL poussée est
**relue avec le parseur réel de la page d'arrivée**.

---

### ⛔ CONSTAT MESURÉ, NON CORRIGÉ : le HTML initial des 404 est VIDE

En production, les deux pages 404 délivrent une coquille `<html id="__next_error__">`
avec une frontière Suspense **non résolue** ; le contenu n'arrive que par la
charge RSC, donc **rendu côté client après hydratation**. Témoin `/fr/cgu` :
page complète dans le HTML. Antérieur à cette session, prouvé en A/B sur le même
build.
⚠ **Une note de livraison antérieure annonçait « 404 traduite, layout complet ».
C'était faux** : la phrase était cherchée par sous-chaîne dans la réponse
entière, et s'y trouvait dans le **script de streaming**, pas dans le HTML.
Le statut HTTP 404 est correct, un navigateur affiche bien la page ; un robot
sans JS voit une page blanche. La correction connue passe par un `app/layout.tsx`
racine, ce qui déplacerait le `<html>` porté par `[locale]/layout.tsx` :
**décision de structure, non prise**.

---


## Sessions des 20 au 22/08/2026 — D233 à D248 · campagne SOLID/Strategy

### Où en est le code, en une lecture

| Lot | Décisions | État |
|---|---|---|
| S0 / S0-bis — README | D233 | ✅ livré, appliqué |
| S1 — autorité des statuts verrouillants | D234 | ✅ livré, 2/2 mesurées avec `--int` |
| S2 — cœur commun des notifications | D235 | ✅ livré, 5/5 |
| S2-bis — trous de fixtures d'intégration | D236 | ✅ livré |
| **R4 — le refus de devis rendait 500** | **D237, D238, D239** | ✅ **défaut de production corrigé**, 2/2 |
| S3 — politique de transition pure | D240, D241 | ✅ livré, 6/6 |
| S4 — registres de stratégies | D242 | ✅ livré, 7/7 |
| S5a-0 / S5a — port du paiement | D243, D244 | ✅ livré, 9/9 |
| S5b — port de la concurrence | D245 | ✅ livré, 5/5 |
| S6 — événements post-commit | D246 | ✅ livré, 6/6 |
| S7 — garde des sorties de test | D247 | ✅ livré, 2/2 |
| R5 — faux positif du harnais | D248 | ✅ correctif livré |

**Compteurs mesurés au 22/08/2026** — API **556/50** · api-client **34/2** · client **239/18** · pro **344/27** · **intégration 424/34** · parité i18n **1090 = 1090** · typecheck, lint, build : exit 0.
**Campagnes de neutralisation : 74 gardes rouges** sur douze campagnes (13 + 10 + 7 + 2 + 2 + 5 + 6 + 7 + 9 + 5 + 6 + 2), toutes rejouées par Ko après le correctif D248.

---

**D233 — `prisma migrate dev` ALIGNE la base sur le schéma ; il ne « propose » pas.**
Le README décrivait `migrate deploy` sous le nom de `migrate dev` et promettait qu'il régénère le client. Il ne le fait pas. Le danger n'était pas l'ordre donné mais celui qu'il induisait : un opérateur constatant que le client n'a pas bougé cherche la commande qui le régénère — celle qui a détruit la FK composite B2. **Motif corrigé** : `migrate dev` ne connaît QUE ce que `schema.prisma` déclare ; toute table, colonne ou contrainte présente en base mais absente du schéma — au premier rang `EXCLUDE`, index partiels, certains `CHECK`, FK composites — lui apparaît comme un écart, et « corriger » veut dire SUPPRIMER l'objet de la base réelle. Ce n'est pas une erreur de jugement de l'outil, c'est son fonctionnement nominal.

**D234 — L'autorité sur les statuts verrouillants est `HARD_BOOKING_STATUSES`, et elle l'est en TROIS endroits, pas deux.**
L'audit en nommait deux. Le recensement en a trouvé un troisième : `availability.service.ts:53`, à **quatre lignes** de la dérivation correcte, dans un fichier dont le commentaire proclamait déjà l'autorité unique. Le danger n'y était pas la recopie mais l'**asymétrie** : un statut verrouillant ajouté serait entré dans le `Set` de classification sans entrer dans le `WHERE` de chargement — le calendrier aurait annoncé **libre un créneau que la base verrouille**. `PENDING` reste écrit sur place : c'est ce que ce fichier AJOUTE au verrou dur, pas une seconde autorité sur celui-ci.

**D235 — [ÉCART] Le cœur commun des notifications est une FONCTION, pas un service injectable.**
La directive demandait un injectable. Mesuré : `visit-notifications.service.spec.ts` construit son service par quatre arguments positionnels ; une cinquième dépendance injectée aurait imposé de MODIFIER cette spec pour la faire repasser au vert — le geste qu'un lot de refactoring n'a pas le droit de faire. Une fonction partagée laisse les constructeurs intacts et suit la convention déjà en place (`renderTemplate`). Le `logger` est **passé par l'appelant** : les deux services posent un contexte distinct, et un `setContext` par appel sur une instance partagée aurait créé une course entre requêtes concurrentes.

**D236 — Une garde posée sur du code partagé se vérifie chez TOUS ses consommateurs, et l'intégration en avait trois trous.**
S1 et S2 avaient différé la moitié de leur preuve à l'intégration. Cette moitié est revenue **muette** : aucune réservation `CONFIRMED` n'existait dans toute la suite d'intégration ; `conflictIds` n'était exercé qu'avec des `PENDING`, donc `locks()` n'était atteint par aucun test ; le statut des lignes `Notification` n'était pas asserté côté réservation. Quatre tests ajoutés. **La leçon dépasse le lot : une preuve différée n'est pas une preuve, et il faut vérifier que le filet existe AVANT de s'y suspendre.**

**D237 — ⛔ DÉFAUT DE PRODUCTION : `CANCELLED` n'a jamais été ajouté au type PostgreSQL `QuoteStatus`.**
Q3a (D161) l'a introduit dans `schema.prisma` et dans le code ; aucune migration ne l'a ajouté au type. Chaque `POST /quotes/:id/cancel` produisait un `22P02` que le filtre d'exception de Nest repliait en 500 générique. **L'action « je clos ce devis » était inopérante depuis Q3a.** Typecheck, lint, build et 1 109 tests unitaires passaient tous. Les 23 énumérations Prisma ont été diffées contre la base : **une seule divergence**, celle-ci. Aucune reprise de données nécessaire — la valeur n'existant pas, aucune ligne ne pouvait la porter. Corrigé par `20260821000000_quote_status_cancelled`.
⚠ **Ce défaut est l'invariant du dépôt pris en flagrant délit** : les migrations sont la SEULE autorité sur le schéma réel, et **rien ne compare `schema.prisma` à la base**.

**D238 — `quotes_sent_at_coherent` portait une prémisse que Q2 avait rendue fausse.**
La contrainte disait « tout état autre que DRAFT implique une remise » — vrai en août, quand `SENT` était un statut. Depuis Q2/D160, `DRAFT` est le seul état ouvert et la remise est un geste RÉPÉTABLE qui ne change pas le statut : clore un brouillon jamais remis est un cas réel, que l'entonnoir D162 compte explicitement. **D55 dans le sens qui dérange** : le cas réel existe, la borne le refuse, c'est la BORNE qui est fausse. Corrigé par `20260821000100_quote_cancel_without_delivery`, en deux migrations et non une : `ALTER TYPE … ADD VALUE` interdit d'utiliser la valeur neuve avant le commit.
⚠ **`ACCEPTED` porte la MÊME prémisse périmée** — un brouillon se convertit sans remise (D160), et E3 posera `ACCEPTED` sur une ligne à `sent_at` nul. **À trancher avant que E3 n'écrive son premier `ACCEPTED`.**

**D239 — Une garde dont l'objet disparaît se retire PAR ÉCRIT, jamais en sourdine.**
La garde qui mesurait l'effet du tri D166 sur les lignes semées n'a plus d'objet : D166 n'est plus la dernière migration, elle s'applique pendant la préparation, sur une base encore vide. Elle a été mise en `it.skip` un instant : **c'était une erreur**. Une garde en sourdine se lit comme une garde, se compte comme un test, et ne mesure rien — le pire des trois états. Ce qu'on y perd est consigné : plus rien ne vérifie que la clause `NOT EXISTS` de D166 épargne les devis convertis.

**D240 — Les transitions vivent dans deux modules PURS ; le code transactionnel n'a pas bougé.**
`booking-transitions.ts` et `quote-transitions.ts` portent la table commande → statuts source → statut cible. Le verrou `FOR UPDATE`, la relecture D117, le contrôle de blocage, le check-and-set et la traduction de l'`EXCLUDE` sont restés lettre pour lettre. Côté devis, le tableau dit ce que le code ne disait nulle part : **trois des quatre commandes n'écrivent aucun statut**. `quoteWrittenStatus` LÈVE plutôt que de rendre un repli — un `?? CANCELLED` au site d'appel aurait rendu le champ `to` décoratif.

**D241 — Une matrice qui se relit elle-même n'est pas une garde.**
La spec exhaustive de la politique recalculait les statuts permis **depuis le tableau muté** : elle prouvait que la fonction de décision est fidèle au tableau, elle ne figeait aucune valeur. Ouvrir `cancelAsPro` à `PENDING` la laissait verte — et l'intégration aussi, car **rien nulle part** ne vérifiait qu'un pro ne peut pas annuler une demande encore `PENDING`. Ce n'est pas cosmétique : `decline` écrit `DECLINED` et `declineReason`, `cancel` écrit `CANCELLED` et `cancellationReason` ; l'entonnoir compterait l'un pour l'autre. Deux gardes ajoutées, dont une comportementale et non un instantané du tableau.

**D242 — [ÉCART] Un `pricingType` inconnu est REFUSÉ, il ne se vend plus au prix « à l'unité ».**
La cascade d'origine n'avait pas de branche `PER_UNIT` : c'était le **retombé**. Un type que le code ignore se vendait au prix à l'unité, en silence, sur le chemin de l'argent. Conserver ce comportement aurait voulu dire écrire `?? RESOLVERS.PER_UNIT` — coder sciemment le piège. Le `Record` exhaustif fait mieux : il ne compile plus si l'énumération gagne une valeur sans stratégie. Côté moteur de règles, **aucun écart** : le `default: return false` est conservé, et il n'est pas redondant avec l'exhaustivité — celle-ci vaut à la compilation, une colonne de base peut porter autre chose.

**D243 — Sur le chemin de l'argent, on pose le filet AVANT de déplacer le code.**
Le cadrage S5a a mesuré que `PaymentsService` n'avait aucune spec, aucun test d'intégration touchant la table `Payment`, et **aucun appelant**. `openIntent` pouvait être cassé de dix façons sans qu'une porte ne bouge. Un sous-lot `S5a-0` a donc écrit la mesure **avant** l'extraction, sans déplacer une ligne. ⚠ **La prémisse du pilote, que j'avais moi-même écrite, était fausse** : ce qui rendait le paiement « facile » — rien ne dépend de lui — est précisément ce qui le rendait impropre à servir de pilote sans filet.

**D244 — Port de persistance du paiement ; les gardes suivent le code qu'elles surveillent.**
Quatre des treize gardes de S5a-0 mesuraient des `where` — la règle d'accès D47 et l'idempotence. Extraire le port les aurait fait disparaître du niveau service : elles ont **déménagé avec le code**, dans une spec d'adaptateur. Bilan 19 gardes contre 13. ⚠ **Nuance à retenir** : « mocker Prisma pour vérifier qu'on appelle Prisma ne mesure rien » est vrai pour « `findFirst` a été appelé », faux pour « le pro propriétaire est dans le `OR` » — celle-là mesure une règle de sécurité.
⚠ **Course rapportée, non corrigée** : `findFirst(PENDING)` puis `create` ne sont pas dans une transaction. Deux appels concurrents peuvent créer deux intentions ; `payments_one_paid_per_booking` n'interdit qu'un second `PAID`. **À rendre atomique avant E3c.**

**D245 — [ÉCART] S5b prend la CONCURRENCE, pas la persistance entière.**
`bookings.service.ts` porte 23 accès Prisma ; un port complet compterait onze à treize méthodes — l'interface fourre-tout pour laquelle `AuthService` avait été écarté. Le risque tient dans DEUX blocs. Le critère « `BookingsService` ne référence plus `PrismaService` » est **abandonné** et remplacé par un critère mesurable et tenu : **plus aucun `$transaction`, aucun SQL brut, aucun code SQLSTATE dans le service**. Vérification par lecture consignée : 19 des 36 lignes exécutables reprises au caractère près, les 17 écarts se rangeant tous dans trois transformations mécaniques.
⚠ `BookingRow`, type dérivé de Prisma, traverse le port : redéclarer une vingtaine de champs à la main aurait créé une **seconde autorité sur la forme d'une ligne**. Entre deux principes qui se contredisent, l'autorité unique l'emporte — D237 a montré le prix de l'autre choix.

**D246 — D63 n'est pas révoquée, son motif est ÉTENDU.**
Huit appels directs sont devenus sept publications et une table d'abonnements. La publication reste **synchrone, en processus, `await`ée**, aux mêmes sites d'appel qu'avant — c'est-à-dire après résolution de la transaction. Ce que le lot apporte est une **couture** : E3c substituera pg-boss sans toucher aux cas d'usage.
⚠ **Renforcement signalé** : la couture attrape et journalise les erreurs de handler. Le cœur commun n'attrapait que l'ENVOI ; un gabarit cassé remontait en 500 sur une réservation déjà écrite. Et un handler tombé ne prive plus les suivants de leur courrier.
⚠ **Risque introduit** : publier sans abonné ne lève pas. Couper une ligne de la table de routage ne casse rien de visible — d'où quatre cibles de campagne qui coupent un abonnement et se mesurent **en base**.

**D247 — La garde des sorties de test ferme l'avenir, elle ne nettoie pas le passé.**
119 avertissements `not wrapped in act(...)` sur sept fichiers, dont **102 sur deux**. Un tel avertissement signale un état mis à jour APRÈS la fin du test — le symptôme d'une régression asynchrone. Tant que la sortie en contient cent, personne ne verra la cent-unième. La garde collecte pendant le test et **juge dans le `afterEach`** : lever depuis le `console.error` que React appelle interromprait React au milieu de son rendu. Les sept fichiers sont **exemptés nommément, avec compte et date**. Aucune correction n'a été faite : aucun fichier touché par S1→S6 n'est bruyant, et les deux plus gros portent des gardes qu'on affaiblirait en les faisant taire.

**D248 — Une cible de neutralisation SANS MESURE n'a pas eu lieu ; elle n'est ni rouge ni verte.**
Quand toutes les mesures d'une cible étaient désactivées (cibles purement `int` lancées sans `--int`), la liste des verdicts était vide — donc « aucun vert » — donc la cible était comptée comme **mordue**. S6 annonçait six gardes rouges alors que quatre n'avaient rien exécuté. ⚠ **C'est la famille D209 à l'endroit le plus embarrassant possible** : l'outil dont le seul métier est de démasquer les gardes qui ne mesurent rien rapportait lui-même comme succès des cibles qui ne mesurent rien. Le défaut était latent dans S1, S2 et S3 — jamais déclenché, chacune de leurs cibles ayant au moins une mesure unitaire. Corrigé : marquage `⊘ NON MESURÉE`, listage séparé, **code de sortie 3** et mention « CAMPAGNE INCOMPLÈTE ».


## Sessions des 19 et 20/08/2026 — D210 à D232

