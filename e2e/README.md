# Suite e2e — T1 (D118)

## Pourquoi elle existe

Les six portes n'ont pas vu le double `POST /auth/refresh` au démarrage. Elles ne
pouvaient pas : le défaut ne vit que dans l'interaction **navigateur réel +
montage React + timing réseau**. Aucune porte ne monte un composant dans un
moteur de rendu ; aucune n'ouvre deux onglets sur une même session.

## Ce qu'elle n'est pas

**Pas une septième porte obligatoire.** Elle se lance à la demande :

- avant tout lot touchant **auth, concurrence ou argent** ;
- avant chaque **livraison finale**.

Elle démarre trois serveurs et une base. Une porte trop lente finit contournée.

## Lancer

```bash
pnpm install                 # une fois : le lockfile inclut désormais @zwadj/e2e
pnpm test:e2e:install        # une fois : télécharge Chromium
pnpm db:up                   # PostgreSQL (docker compose)
pnpm test:e2e
```

Playwright démarre **sa propre pile**, sur des **ports dédiés** : API `3101`,
Client `3100`, Pro `5273`. Tu peux laisser tes serveurs de dev tourner — les
deux piles cohabitent, il n'y a rien à arrêter.

⚠ `reuseExistingServer: false` partout, volontairement. La première version
réutilisait les ports de dev : quand les serveurs de dev tournaient, l'API
répondait sur la base `zwadj` pendant que le harnais écrivait ses comptes dans
`zwadj_e2e`. Deux bases, une suite — les comptes créés n'existaient pas pour
l'API. Sur des ports dédiés, la question ne se pose plus.

## Throttle

Aucun aménagement dans le code de production, et il n'en fallait aucun :
`auth.throttle.ts` lit déjà des variables `THROTTLE_*` décrites comme « levier
de test uniquement », volontairement hors du schéma env validé — en production
rien n'est défini et les vraies limites s'appliquent. `test/int/setup-env.ts`
s'en sert ainsi depuis le Lot 1 ; `playwright.config.ts` fait pareil, et
uniquement pour le serveur qu'il démarre lui-même.

## Un compte PAR TEST, et c'est délibéré

Les partager réduirait la pression sur le throttle — mais le throttle n'est plus
un problème, et le partage coûterait cher : une révocation globale déclenchée
par un test (cookie corrompu, réutilisation détectée) tuerait la session d'un
autre test sur le même utilisateur. C'est précisément ce que ces tests mesurent.
La création de compte passe par la vraie route HTTP : le hash argon2 est le
vrai, et le harnais ne duplique pas la transaction d'inscription.

## Base de données

Base **dédiée** `zwadj_e2e`, recréée et migrée à chaque run par
`global-setup.ts`. Ni `zwadj` (données de dev, que la suite effacerait), ni
`zwadj_test` (celle de `test:int`, qui la recrée de son côté).

Surcharge possible : `E2E_DATABASE_URL`.

## ⚠ Serveurs de DÉVELOPPEMENT, délibérément

L'usage veut qu'on teste le build de production. Ici ce serait passer à côté de
la cible : `React.StrictMode` ne double le montage **que** dans un build de
développement, et c'est ce double montage qui a révélé D115. Contre un build de
prod, tous les tests A2 seraient verts sans rien garantir.

Un second projet « prod » (SSR et hydratation réels) a sa place plus tard pour
A5. Il n'annulera pas celui-ci.

## ⚠ Assertions réseau, pas DOM

Ces specs jugent le **réseau** et l'**URL**, presque jamais le balisage.
« Un seul appel », « pas de boucle », « même comportement à froid » sont des
propriétés réseau. Un sélecteur CSS changé au prochain lot rendrait la suite
rouge sans qu'aucun invariant n'ait bougé — et une suite qui crie à tort finit
désactivée.

## `retries: 0`

Volontaire. Un test de concurrence qui passe à la deuxième tentative ne prouve
rien. Une instabilité ici est un résultat, pas un bruit à masquer.

## Ce que le premier vrai run a appris

Trois corrections, toutes côté TEST — le code produit n'était en cause dans
aucun des cinq échecs.

**1. Endpoints écrits de mémoire.** `/api/v1/venues/mine` et
`/api/v1/reference/wilayas` n'existent pas ; ce sont `/api/v1/pro/venues` et
`/api/v1/wilayas`. Un compteur qui observe un endpoint inexistant vaut toujours
zéro : il ne mesure rien, ni dans un sens ni dans l'autre.

**2. « Un seul appel » était faux pour les lectures.** Sous `StrictMode` — que
cette suite active délibérément — un effet de montage part DEUX fois. Exiger 1
revenait à exiger que StrictMode n'existe pas. L'assertion dépend désormais de
la nature de l'effet : effet de bord → 1, lecture → `MONTAGES_PAR_RENDU`.

⚠ Au passage, ces échecs ont produit la meilleure preuve de la série : dans le
journal du run, **un seul `POST /auth/refresh` pendant que toutes les lectures
partaient en double**, dans les deux applications. Le double montage est bien
réel, et le mutex de D115 le fusionne — de bout en bout, dans un vrai
navigateur.

**3. Les quatre tests d'A5 étaient VIDES, et ils passaient.** `page.goto()`
recharge toujours le document : la branche « navigation SPA » était un second
démarrage à froid comparé à un démarrage à froid. Corrigé par `spaNavigate`
(historique + `popstate`), et surtout par un **témoin posé sur `window`** dont
la survie est assertée en premier — sans quoi le test peut redevenir vide sans
que personne ne le voie.

Sur 15 tests, le premier run affichait 9 verts. Cinq d'entre eux prouvaient
quelque chose ; quatre étaient creux.

## Premier lancement de T4 : deux références à générer

B7 et B8 comparent à une référence qui **n'est pas livrée**. Ce n'est pas un
oubli : je ne peux pas exécuter Playwright dans mon environnement, et écrire des
valeurs de tokens ou une liste de violations « de mémoire » aurait produit une
référence fausse — c'est arrivé quatre fois dans cette campagne, et chaque fois
le rouge ne prouvait rien.

```bash
UPDATE_TOKEN_BASELINE=1 UPDATE_A11Y_BASELINE=1 pnpm test:e2e
```

Puis **relire** ce qui a été écrit avant de le valider :

- `e2e/baselines/tokens.json` — valeurs résolues des variables CSS, par app et
  par thème ;
- `e2e/baselines/tokens-divergents.json` — tokens qui diffèrent légitimement
  entre les deux apps (les thèmes sont différents par dessein) ;
- `e2e/baselines/a11y.json` — **l'inventaire chiffré de la dette
  d'accessibilité**, ce que D43/D44 n'ont jamais eu.

Ensuite, tout écart échoue. Résorber la dette a11y consiste à retirer des lignes
de `a11y.json` : le test refuse aussi les violations **corrigées** restées dans
la référence, pour que la dette ne paraisse pas éternelle.

⚠ **Pourquoi pas de captures d'écran pour B7.** `toHaveScreenshot()` compare des
pixels : le rendu des polices diffère entre Windows et Linux, les références
seraient rouges au premier changement de machine, et un diff de pixels dit
« quelque chose a bougé » sans dire quoi. On compare les valeurs **résolues** des
variables CSS, lues après cascade dans le vrai navigateur — indépendant de la
plateforme, et un écart se lit : `--accent: #d81b60 → #c2185b`.

## Couverture actuelle

| Spec | Points d'inventaire |
|---|---|
| `a1-session-bootstrap.e2e.ts` | A1 — bootstrap, deux onglets, cookie invalide sans boucle |
| `a2-mount-effects.e2e.ts` | A2 — un appel par montage (effet de bord + lecture seule) |
| `a5-cold-reload-vs-spa.e2e.ts` | A5 — parité navigation interne / rechargement |
| `b7-token-contract.e2e.ts` | B7 — tokens résolus, 2 apps × 2 thèmes |
| `b8-accessibility.e2e.ts` | B8 — axe-core sur 10 écrans, contraste/ARIA/focus |

Restent à outiller : A3 (réponses malformées), A4 (concurrence sur chemins
verrouillés — déjà couvert côté intégration par D117), B6 à B10.

## Dette connue

- `a5` : le test du calendrier de salle est `skip` — il lui faut une salle de
  fixture, à brancher avec T2.
- `a2` : la liste des écrans couvre les entrées principales, pas les 19 effets
  de montage recensés à l'inventaire. Les sections internes d'une salle
  (devis, demandes, visites, prestations, blocages) demandent elles aussi une
  salle de fixture.
