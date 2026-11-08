# D344 — la règle des deux passes de l'e2e (R-4), ÉCRITE AVANT ELLES

Source de la règle : la consigne du rang 46 (`docs/preuves/D344/consigne.md`), R-4, mot pour mot — « La preuve : chaque spec, une fois revenue, mord (neutralisation à la main de la garde qu'elle mesure, rouge lu, restauration — précédent de D325) ; puis l'e2e complète DEUX fois de suite, sur secteur, règle commitée avant : deux vertes ⇒ porte verte ; un rouge ⇒ arrêt, pas de poussée (R-15 de D343). » La règle de D343 (`docs/preuves/D343/portes/regle-deux-passes.md`) est REPRISE telle quelle ; seuls les noms et ce que le lot a changé de la suite diffèrent.

⛔ **ÉTAT DE CETTE PIÈCE À SON PREMIER COMMIT.** Elle est complète : le résultat des passes vit dans `deux-passes-resultat.md`, écrit APRÈS elles, dans un commit postérieur. Le commit de cette pièce **précède le lancement des passes** : c'est `git log` qui le prouve, pas cette phrase. **Aucune section de ce fichier n'est retouchée après les passes.**

## 1. Ce qui est lancé

**Une commande, deux fois de suite** : `pnpm test:e2e` depuis la racine, EN ENTIER, par `docs/preuves/D344/portes/deux-passes-e2e.sh`, `retries` inchangé (0). **Aucun** délai changé, **aucune** spec exclue ou ignorée en plus, **aucune** relance. La **seconde passe ne démarre que si la première est verte** ; le script s'arrête à la première passe rouge.

⚠ **Ce que ce lot a changé dans la suite** : UNE spec de plus, `e2e/specs/r30-lien-calendrier-pro.e2e.ts` (un test, copie identique à l'octet de l'archive de D322). **La spec du rang 32 (r32) N'EST PAS dans la suite** : elle est arrêtée (`docs/preuves/D344/arret-spec.md`, R-3). Les deux passes jouent donc **la suite d'avant plus UN test** ; l'attendu du nombre de tests est **dérivé** par `playwright test --list` avant la première passe et imprimé à côté du mesuré — il ne s'écrit pas ici.

## 2. Portes dures — vérifiées AVANT CHAQUE PASSE

Si l'une est rouge, la passe ne démarre pas, le script le dit (code 3) et la session rapporte sans relancer : poste sur **batterie** (R-9 de D340) ; `chrome` ou `headless_shell` > 0 (D290, D331) ; Docker ou `zwadj-db` absents ; un port d'e2e (3100, 3101, 5273, 5274) occupé ; l'arbre pas propre — **y compris entre les deux passes** ; et, avant la PREMIÈRE passe, l'état des `.env` (un hôte non local, ou une erreur du relevé : D330). Après la dernière passe lancée : les `.env` sont comparés à ceux de l'ouverture (une empreinte qui diffère refuse la marque — D330, règle permanente de D331). La RAM libre est relevée toutes les 30 s ; elle n'est pas une porte ici (la barre de D273 est une règle de CERTIFICATION, en pause : DR1 de D336), elle est rapportée.

## 3. Comment le verdict se lit — sur la sortie BRUTE (D275), avec l'attendu à côté du mesuré

Pour CHAQUE passe :
- **verte** = la commande sort en **0** ET le résumé de Playwright ne porte **aucune** ligne `failed`, **aucune** ligne `did not run`, **aucune** ligne `flaky` ; passés + ignorés = le nombre de tests listé avant la première passe ; le nombre d'ignorés est relevé et rapporté ;
- **rouge** = tout le reste. Aucune autre catégorie : ni « presque verte », ni « verte sauf un test connu ».

## 4. Ce que chaque résultat fait

| passe 1 | passe 2 | conduite |
|---|---|---|
| verte | verte | la porte `test:e2e` est **VERTE** (R-4). Elle s'écrit « deux passes complètes consécutives, vertes, sur secteur », **avec leurs chiffres**, jamais « verte » sans eux. La clôture reprend (les six portes, la passe D277, les fichiers d'autorité, le contrôle de fin de lot). |
| verte | rouge | **ARRÊT** (« un rouge ⇒ arrêt, pas de poussée »). Pas de troisième passe. Rien n'est poussé sur `main`. Le rapport dit les deux résultats et LIT la signature du rouge. |
| rouge | *(non jouée)* | **ARRÊT.** La seconde passe ne démarre pas. Rien n'est poussé sur `main`. Le rapport LIT la signature du rouge. |

## 5. Lire la signature d'un rouge — sans la présumer D265

Un rouge n'est **pas** présumé être D265. S'il porte la chaîne `POST …/auth/register a échoué après N ms` ← `TypeError: fetch failed` ← `Error [ECONNRESET]` : **la réparation est insuffisante ou ne couvre pas ce site** — D265 n'est pas clos, la session s'arrête et rapporte. S'il porte une AUTRE classe (par exemple `Timed out 7000ms waiting for expect(locator).toHaveURL`, D127 : une route compilée à la première demande — et `/calendrier` n'est pas dans le préchauffage, relevé par la lecture adverse, contrôle 17) : c'est **un autre défaut**, la session s'arrête et rapporte aussi ; la condition de la table (`e2e/specs/warmup.setup.ts`, B.3) ne s'ouvre que **sur une mesure** et le départ n'en a pas donné (r30 vert en 3,5 s).

## 6. Ce que cette règle NE fait PAS

- **Pas de troisième passe, quel que soit le résultat** : une passe de plus « pour voir » serait un rejeu.
- **Pas de passe pour verdir** : les deux doivent passer sans que rien n'ait bougé entre elles (le script vérifie l'arbre propre avant la seconde).
- **La passe des six portes de clôture rejouera `test:e2e` une troisième fois** (sa sixième porte, `docs/preuves/D340/portes/passe-secteur.sh`). Un rouge à ce moment **arrête aussi** (D270) : c'est la même règle, pas une exception.
- **Elle ne certifie rien** : aucune marque n'est posée (pause de Ko, DR1 de D336).
