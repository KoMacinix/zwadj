# `availableOn` + SEO + point B (404) + point D (chrome partagée) — v3

> ⛔ **REMPLACE `zwadj-lot-available-on-v2.zip`.** Les archives antérieures sont
> périmées ; la v1 était de surcroît ROUGE au typecheck API.
>
> ⚠ Archive **DIFFÉRENTIELLE** — chemins complets depuis la racine du monorepo.
> Aucune suppression de fichier.
>
> ⚠ **Valider avant extraction** (`git apply --check`, ou extraction témoin).

**52 fichiers** — 10 neufs, 42 modifiés.

## Portes

| Porte | Résultat |
|---|---|
| typecheck `types` / `ui` / `api` / `client` / `pro` | ✅ 0 erreur |
| lint (5 projets) | ✅ exit 0 |
| unitaires API | ✅ **481 / 44** (base 454) |
| unitaires client | ✅ **239 / 18** (base 203) |
| unitaires Pro | ✅ **344 / 27** (base 339) |
| parité i18n FR = AR | ✅ 1090 = 1090 |
| neutralisation `availableOn` client | ✅ **10/10 rouges** |
| neutralisation `availableOn` + B (API) | ✅ **12/12 rouges** |
| neutralisation point D | ✅ **7/7 rouges** |
| CRLF | ✅ 0 LF nu |
| intégration, e2e, build | ⛔ **NON exécutés** |

## Point D — ce que j'ai trouvé en mesurant

**⚠⚠ L'animation carte-à-carte n'a JAMAIS joué, dans AUCUNE des deux
applications, depuis la première livraison.** `animation: wk-step-in` /
`wz-step-in` était correctement déclarée. Le JSX était correct. C'est leur
RENCONTRE qui ne l'était pas : une `animation` CSS ne rejoue que si le nœud est
recréé, et les deux apps rendaient une `<section>` stable que React réconciliait.
L'effet se voyait une fois, au montage, et plus jamais. La maquette, elle, monte
`<div key={step}>` — c'est ce détail, pas la courbe d'accélération, qui fait
l'effet.

Un test sur la classe CSS serait resté vert pendant toute la durée du défaut.
La garde mesure donc **l'identité du nœud DOM**.

**Les deux autres manques** étaient réels aussi : aucune `transition` sur les
pastilles du rail (le passage au rouge était instantané) et aucun trait vertical
entre le dernier récapitulatif et la carte active.

**Et les deux copies avaient déjà divergé** — ce n'étaient pas des choix :

| | Pro | Client |
|---|---|---|
| coche du rail | icône `lucide` | glyphe texte `✓` |
| `flex-shrink` sur « Modifier » | présent | **absent** |
| `:hover` sur la pastille cliquable | présent | **absent** |

## Ce que j'ai fait, et pourquoi pas moins

Plutôt qu'aligner deux copies, je les ai **fusionnées** :
`packages/ui/src/journey.tsx` (`JourneyRail`, `JourneyRecap`, `JourneyCard`,
`JourneyConnector`) + un bloc unique dans `packages/ui/styles.css`. Les feuilles
des apps ne gardent que la **mise en page** (`grid-area`, position collante).

Motif : la duplication a **déjà** produit trois écarts que personne n'a vus.
Aligner deux copies les ferait re-diverger ; il n'y a plus qu'une implémentation.
C'est le même raisonnement que pour `HARD_BOOKING_STATUSES` et
`SLOT_END_MAX_MINUTES` plus tôt dans ce lot.

`lucide-react` **n'est plus importé** dans `walkin-journey.tsx` : la coche vit
dans `@zwadj/ui`, qui en dépend déjà — le client obtient la même icône sans
ajouter le paquet.

⚠ `prefers-reduced-motion` coupe désormais aussi les **transitions** du rail :
ce lot vient de les ajouter, et une transition est une animation.

⚠ Les gardes du point D sont écrites **des deux côtés**. Une garde d'un seul
côté aurait reproduit exactement le défaut qu'elle surveille. La neutralisation
D1 le vérifie : retirer le `key` doit faire rougir **client ET pro**.

## ⛔ Fautes corrigées depuis la v1

1. **Typecheck API rouge dans l'archive livrée** — mesuré avant d'écrire les
   specs, jamais relancé avant d'emballer.
2. **Code d'erreur lu à la racine** au lieu de `message.code` — n'aurait jamais
   reconnu `AVAILABLE_ON_PAST` en production, et mes tests portaient la même
   forme inventée : ils validaient la faute.
3. **`HttpException.getResponse()` enveloppe une chaîne** — le marqueur du 404
   de routage ne se serait jamais déclenché.
4. **Le harnais corrompait l'arbre** : son `finally` protège de l'exception, pas
   du signal. Sauvegarde disque avant mutation + restauration au démarrage.

## Décisions à numéroter

1. **`AVAILABLE_ON_PAST`** — écart assumé avec D49 (fenêtre ≠ point). Refus dans
   le service, jamais dans Zod. Aujourd'hui accepté (`<`, pas `<=`).
2. **`availableOnDate` a trois valeurs** — `null` ne grise jamais.
3. **`PENDING` ne grise pas (D101)** — et n'est pas chargé.
4. **Moteur scindé, pas trompé** — `computeDaySlotStatuses`, autorité unique.
5. **Règle SEO** — variante ⇒ `noindex, follow`, canonical sur la page nue.
   ⚠ Renonce à la longue traîne.
6. **404 de routage API normalisé** en `{ code: ROUTE_NOT_FOUND }` ; les 404
   **métier** ne sont pas touchés.
7. **Chrome de parcours unifiée dans `@zwadj/ui`** — plus deux copies à aligner.

## Ruptures de contrat

- `searchVenues` rend `SearchOutcome` (`ok` / `past-date` / `unreachable`).
- `SearchView` reçoit `outcome`, non plus `results`.
- `AllExceptionsFilter` exporte `ROUTE_NOT_FOUND`.
- **`.wk-*` et `.wz-*` de chrome n'existent plus** (rail, récapitulatif, carte,
  animations). Tout code externe qui s'y accrochait doit passer aux `.zj-*`.

## Reste à faire

- **Intégration, e2e, build** : hors de portée ici. Deux zones en dépendent —
  les 17 tests d'intégration du 409 `AVAILABILITY_BLOCK_CONFLICT`, et les deux
  pages 404, **dont aucune n'a jamais été rendue**.
- **~11 clés arabes neuves non relues** par un locuteur.
- **Docs de gouvernance non régénérés.**
- **Date au-delà de l'horizon 18 mois** — arbitrage en attente.
- **Points A et C** en attente. C est bloqué : garder `/assistant` avec le seul
  libellé changé, ou redirection 301 ?

## Harnais

```
python3 neutralize-available-on.py       [depuis] [jusqua]   # client — 10
python3 neutralize-available-on-api.py   [depuis] [jusqua]   # API    — 12
python3 neutralize-journey.py            [depuis] [jusqua]   # point D — 7
```

Les trois **assertent leur nombre de remplacements** et **survivent à une
interruption**.
