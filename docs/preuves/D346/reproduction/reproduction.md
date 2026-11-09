# D346 — R-1 : ce qui a été joué dans un navigateur, endroit par endroit

Joué le 09/11/2026 sur secteur, contre le code de `816d435` (aucune ligne de code produit modifiée), par Playwright (Chromium) sur la pile e2e de développement (API 3101, client 3100). FR et AR, mêmes mesures. Les valeurs sont **lues dans le DOM** et comparées à **l'adresse** (la seule autorité, D229) ; aucune n'est déduite du code. Journal brut : `docs/preuves/D346/rouges/rouge-2-navigateur.txt` (lignes `MESURE-…`).

## Verdict

| Endroit | Ce qui est lu | Résultat |
|---|---|---|
| **Assistant**, étape commune (ouverture, revisitée par la liste d'étapes) | valeur de `#wz-city` | ✓ égale à l'adresse, FR et AR |
| **Assistant**, étape invités (revisitée par la liste d'étapes) | valeur de `#wz-guests` | ✓ `250` |
| **Assistant**, étape budget | palier `aria-pressed="true"` | ✓ (aucun avant la réponse ; voir « limite » ci-dessous) |
| **Assistant**, étape goûts | puces `aria-pressed="true"` | ✓ 2 sur 2 après les coches ; ✓ au retour du navigateur |
| **Assistant**, bouton retour du navigateur, de bout en bout | chaque étape | ✓ chaque étape reflète l'adresse, FR et AR |
| **Formulaire des filtres**, commune (`#f-city`) | valeur | ✗ **reste à « Toutes les communes »** à chaque étape où l'adresse porte une commune |
| **Formulaire**, poignée basse de capacité (`guests`) | valeur du `range` | ✗ **reste à `20`** alors que l'adresse porte `guests=250` |
| **Formulaire**, poignée haute de budget (`maxPrice`) | valeur du `range` | ✗ **reste à `1500000`** alors que l'adresse porte `maxPrice=750000` |
| **Formulaire**, styles et équipements cochés | cases `:checked` | ✗ **aucune cochée** alors que l'adresse en porte un de chaque |
| **Formulaire, assistant FERMÉ** (« Voir les salles ») | toutes les valeurs | ✗ **rien du tout** : la page de résultats filtre sur l'adresse, le panneau de filtres affiche l'état vide |
| **Formulaire**, « Recommencer » depuis un état plein | toutes les valeurs | ✓ par coïncidence : le formulaire n'a jamais rien montré, il n'a donc rien à vider |

⇒ **Le défaut est dans le formulaire des filtres de `/salles`, pas dans l'assistant.** La piste de R-2 est confirmée, et plus large qu'elle ne le disait : `RangeFilter` (capacité, budget) et la radio du type de cérémonie sont des `useState` initialisés une fois (lecture adverse, ligne 6), pas seulement des `defaultValue`.

## Les écarts avec la consigne, relevés en jouant

1. **Pas de bouton « Précédent »** : on revisite par la liste d'étapes, le récapitulatif et le bouton retour du navigateur (lecture adverse, ligne 7) — c'est ce qui a été joué.
2. **Une lecture trop tôt est un faux rouge.** Au retour du navigateur, l'adresse change *avant* que la page se rende de nouveau : une lecture immédiate a donné « 0 coche » au lieu de 2 (une fois, en FR). La spec attend donc que l'écran atteigne l'adresse (sondage borné de 2,5 s) ; le résultat ci-dessus est pris avec cette attente.
3. **La base e2e n'affichait ni styles ni équipements** au premier passage : le serveur de développement du client met en cache **une heure** les listes de référentiels (`next: { revalidate: 3600 }`, `apps/client/src/lib/api.ts:146-169`), **sur disque** (`apps/client/.next/cache/fetch-cache`), et le préchauffage de la suite les lit **avant** le semis — il y met des listes vides qui survivent aux relances. Contournement du seul rejeu de reproduction : `--no-deps` (pas de préchauffage) et cache vidé avant. ⚠ **Conséquence pour la suite complète** : dans une passe complète, les puces de goûts de `/salles` n'existent pas pour un test qui s'exécute après le préchauffage ; la spec du lot doit s'y adapter (voir `rouges.md`).
4. **Limite de cette reproduction** : la commune/les invités/le budget se mesurent à l'ouverture sans réponse (valeurs vides) ; la **seule** vraie mesure « avant/après réponse » est faite aux étapes suivantes, ce qui suffit au verdict.
