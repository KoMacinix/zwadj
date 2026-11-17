# D350 — la PREMIÈRE passe des six portes : ROUGE sur `pnpm test`, par un défaut du lot

Pilote : `docs/preuves/D340/portes/passe-secteur.sh` (non modifié). SHA joué : `89994285f1f86d435e365e98efcf09b261d8586b` (arbre propre, secteur, 0 échantillon sur batterie sur 34, `chrome` et `headless_shell` à 0, Docker `zwadj-db` lancé, les quatre ports d'e2e libres).

| porte | code | durée | chiffres |
|---|---|---|---|
| `typecheck` | 0 | 23 s | — |
| `lint` | 0 | 14 s | — |
| `test` | **1** | 113 s | api-client 9 fichiers / 77 tests ; api 84 / 1 450 ; **client 41 fichiers, 1 en échec : 498 passés sur 499** ; pro 56 / 838 |
| `build` | 0 | 31 s | — |
| `test:int` | 0 | 467 s | 50 fichiers / 798 tests |
| `test:e2e` | 0 | 379 s | 102 passés + 1 ignoré (103 listés par `playwright test --list`, relevé AVANT la passe) |

## Ce que le rouge dit

Un seul test, dans l'application CLIENT : `apps/client/src/lib/intl-locale-guard.test.ts` — « FC-6 — la langue de la page passe à chaque formateur de date et de nombre > aucun formateur de date ou de nombre ne choisit sa langue — ni son fuseau — tout seul ». C'est une garde de SOURCE (D249, D290) qui lit les sources des DEUX applications et des paquets, et qui rend :

```
apps/pro/src/admin/admin-texts.ts:160 — formateur Intl sans intlLocale
apps/pro/src/admin/admin-texts.ts:165 — formateur Intl sans intlLocale
apps/pro/src/venues/publication-review.tsx:29 — formateur Intl sans intlLocale
```

(la sortie complète, masquée, est `test.txt` à côté de cette note). **Ce sont les trois formateurs `Intl` que ce lot a écrits** : la date et le taux de l'écran d'administration, et la date du refus que le pro lit. La règle est `intlLocale` de `@zwadj/types` (arbitrage de Ko du 04/10/2026, FC-6) ; ce lot écrivait `"fr-DZ"` et `locale === "ar" ? "ar-DZ" : "fr-DZ"` en dur.

**C'est un défaut du lot, pas un rouge d'ailleurs.** Aucune porte précédente ne l'avait vu : les suites de l'application Pro (56 fichiers, 838 tests), seules jouées pendant l'écriture, ne contiennent pas cette garde — elle vit dans l'autre application. La passe complète des portes l'a trouvé, c'est ce qu'elle est pour.

## Ce qui en découle (extension 5 de la table d'ouverture, commitée avant le correctif)

- Le correctif : `intlLocale(...)` en premier argument de chaque formateur ; les deux formateurs de l'administration passent dans un module neuf, `apps/pro/src/admin/admin-format.ts`, parce que `admin-texts.ts` ne peut importer aucun paquet (la spec e2e le lit).
- Les fichiers ciblés par la campagne d'ADM-2 changent : **la campagne est REJOUÉE EN ENTIER** (passe 3).
- Les six portes sont **REJOUÉES EN ENTIER après ce dernier changement de code** ; cette passe 1 n'est pas une passe certifiante pour le code livré — elle est versée comme le rouge. Les cinq autres sorties brutes de cette passe (vertes, sur le code d'AVANT le correctif) restent hors dépôt : leurs empreintes sha256 sont `typecheck` `550b04a2…`, `lint` `5350bf33…`, `build` `9cd2fbeb…`, `test:int` `7c3a8f29…`, `test:e2e` `c77e6958…` (celle de `test` brut : `c01dc7d8…`, 75 088 octets ; la pièce versée est la sortie sans codes ANSI, masquée, brute de 55 700 octets, sha256 `c8a133df…`).
- Le masquage : `docs/preuves/D350/masquage/masquer-jetons.py` (copie octet pour octet de celle de D348) — 0 occurrence à masquer dans cette sortie, 0 restante.
