# FC-1 — la prémisse, vérifiée à `aee7bc4` (D231)

**Le défaut existe encore.** Relevé dans `apps/client/src/app/theme.css` à ce SHA :

| sélecteur | ligne | déclaration | taille | où il se voit |
|---|---|---|---|---|
| `.filters-reset` | 131-136 | `color: var(--accent);` | 12 px | lien « Réinitialiser » de la barre de filtres de `/salles` |
| `.range-value` | 221-225 | `color: var(--accent);` | 13 px | valeur des curseurs (capacité, budget) de `/salles` |
| `.results-count-n` | 422-425 | `color: var(--accent);` | hérité (texte normal) | le nombre de salles, seulement s'il y a au moins un résultat |
| `.wz-eyebrow` | 1301-1311 | `color: var(--accent);` | 12 px | le surtitre de l'assistant (`/assistant`) |

`e2e/baselines/a11y.json`, écran « client recherche de salles » : `color-contrast @ .filters-reset` et `color-contrast @ .range-value`
y sont TOLÉRÉES ; `.results-count-n` et `.wz-eyebrow` n'y sont pas — B8 ne les voit pas (le compteur n'apparaît qu'avec au moins
une salle publiée, la base de l'e2e n'en a aucune au passage de B8 ; l'assistant n'est pas dans la liste des écrans de B8).

**Le contraste, recalculé (formule WCAG 2.x)** à partir des tokens des feuilles :

| texte \ fond | `--surface` #ffffff | `--bg` #fafafa | `--bg-2` #f4f4f5 |
|---|---|---|---|
| `--accent` #da3642 (clair) | 4,58 | **4,39** | **4,16** |
| `--accent-text` #b32c36 (clair) | 6,31 | 6,04 | 5,74 |
| `--accent-text` = `--dark-accent` #e07a84 (sombre ; fonds #1c1c1c, #111111, #252525) | 5,91 | 6,55 | 5,32 |

⇒ En clair, `--accent` échoue sur `--bg` et `--bg-2` ; `--accent-text` passe partout, dans les deux thèmes. Mêmes chiffres que
l'en-tête de `theme.css` (D264). **Le correctif est celui que D264 a déjà posé sur trois sélecteurs** : `var(--accent-text)`.
Aucun token partagé ne bouge (D129) : `--accent-text` est le token dédié, déclaré dans les deux thèmes.

⚠ **Le commentaire de `.results-count-n` est faux, et c'est la cause de l'oubli** : « Accent en TEXTE : légitime ici et
seulement ici, parce que `.search-results` est sur blanc pur ». Le test mesure le pire fond neutre, pas le fond supposé : le
commentaire est corrigé avec le code.
