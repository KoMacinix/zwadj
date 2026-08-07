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

## Couverture actuelle

| Spec | Points d'inventaire |
|---|---|
| `a1-session-bootstrap.e2e.ts` | A1 — bootstrap, deux onglets, cookie invalide sans boucle |
| `a2-mount-effects.e2e.ts` | A2 — un appel par montage (effet de bord + lecture seule) |
| `a5-cold-reload-vs-spa.e2e.ts` | A5 — parité navigation interne / rechargement |

Restent à outiller : A3 (réponses malformées), A4 (concurrence sur chemins
verrouillés — déjà couvert côté intégration par D117), B6 à B10.

## Dette connue

- `a5` : le test du calendrier de salle est `skip` — il lui faut une salle de
  fixture, à brancher avec T2.
- `a2` : la liste des écrans couvre les entrées principales, pas les 19 effets
  de montage recensés à l'inventaire. Les sections internes d'une salle
  (devis, demandes, visites, prestations, blocages) demandent elles aussi une
  salle de fixture.
