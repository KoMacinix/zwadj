# D343 — la règle des deux passes de l'e2e (R-15), ÉCRITE AVANT ELLES

Source des règles : la consigne du rang 45 (suite) (`docs/preuves/D343/consigne.md`), R-12 et R-15, mot pour mot — « L'aléa bloque la poussée (D270) ; ni rejeu de plus (b, R-6 de D339), ni exception (c : une exception à D270 n'appartient qu'à Ko). » et « LA PREUVE : le rouge isolé avant, le vert isolé après (et la correction neutralisée, le rouge revient) ; puis l'e2e complète DEUX fois de suite, sur secteur, règle commitée avant : deux passes vertes ⇒ la porte e2e est verte ; un seul rouge ⇒ arrêt, pas de poussée. Motif : une fois la cause nommée et corrigée, deux passes complètes valent preuve ; ce n'est pas rejouer pour verdir, puisque les deux doivent passer. »

⛔ **ÉTAT DE CETTE PIÈCE À SON PREMIER COMMIT.** Elle est complète : le résultat des passes vit dans `deux-passes-resultat.md`, écrit APRÈS elles, dans un commit postérieur. Le commit de cette pièce **précède le lancement des passes** : c'est `git log` qui le prouve, pas cette phrase. **Aucune section de ce fichier n'est retouchée après les passes.**

## 1. Ce qui est lancé

**Une commande, deux fois de suite** : `pnpm test:e2e` depuis la racine, EN ENTIER, par `docs/preuves/D343/portes/deux-passes-e2e.sh`, `retries` inchangé (0). **Aucun** délai changé, **aucune** spec exclue ou ignorée en plus, **aucune** relance. La **seconde passe ne démarre que si la première est verte** ; le script s'arrête à la première passe rouge.

⚠ **Ce que ce lot a changé dans la suite** : la correction de `e2e/fixtures/harness.ts` (`connection: close` sur les deux fonctions qui appellent le `fetch` global) et UNE spec de plus, `e2e/specs/d265-socket-perimee.e2e.ts` (deux tests, une mesure de la fermeture serveur et deux blocages un peu plus longs qu'elle). Les deux passes jouent donc **la suite d'avant plus deux tests** ; l'attendu du nombre de tests est **dérivé** par `playwright test --list` avant la première passe et imprimé à côté du mesuré — il ne s'écrit pas ici.

## 2. Portes dures — vérifiées AVANT CHAQUE PASSE

Si l'une est rouge, la passe ne démarre pas, le script le dit (code 3) et la session rapporte sans relancer : poste sur **batterie** (R-9 de D340) ; `chrome` ou `headless_shell` > 0 (D290, D331) ; Docker ou `zwadj-db` absents ; un port d'e2e (3100, 3101, 5273, 5274) occupé ; l'arbre pas propre — **y compris entre les deux passes** ; et, avant la PREMIÈRE passe, l'état des `.env` (un hôte non local, ou une erreur du relevé : D330). Après la dernière passe lancée : les `.env` sont comparés à ceux de l'ouverture (une empreinte qui diffère refuse la marque — D330, règle permanente de D331). La RAM libre est relevée toutes les 30 s ; elle n'est pas une porte ici (la barre de D273 est une règle de CERTIFICATION, en pause : DR1 de D336), elle est rapportée.

## 3. Comment le verdict se lit — sur la sortie BRUTE (D275), avec l'attendu à côté du mesuré

Pour CHAQUE passe :
- **verte** = la commande sort en **0** ET le résumé de Playwright ne porte **aucune** ligne `failed`, **aucune** ligne `did not run`, **aucune** ligne `flaky` ; passés + ignorés = le nombre de tests listé avant la première passe ; le nombre d'ignorés est relevé et rapporté ;
- **rouge** = tout le reste. Aucune autre catégorie : ni « presque verte », ni « verte sauf un test connu ».

## 4. Ce que chaque résultat fait

| passe 1 | passe 2 | conduite |
|---|---|---|
| verte | verte | la porte `test:e2e` est **VERTE** (R-15). Elle s'écrit « deux passes complètes consécutives, vertes, sur secteur, après la correction de D265 », **avec leurs chiffres**, jamais « verte » sans eux. La clôture reprend (les six portes, les campagnes, la passe D277, les fichiers d'autorité, le contrôle de fin de lot). |
| verte | rouge | **ARRÊT** (R-15 : « un seul rouge ⇒ arrêt, pas de poussée »). Pas de troisième passe. Rien n'est poussé sur `main`. Le rapport dit les deux résultats et LIT la signature du rouge. |
| rouge | *(non jouée)* | **ARRÊT.** La seconde passe ne démarre pas. Rien n'est poussé sur `main`. Le rapport LIT la signature du rouge. |

## 5. Lire la signature d'un rouge — sans la présumer D265

Un rouge n'est **pas** présumé être D265. S'il porte la chaîne `POST …/auth/register a échoué après N ms` ← `TypeError: fetch failed` ← `Error [ECONNRESET]` : **la réparation est insuffisante ou ne couvre pas ce site** — D265 n'est pas clos, l'entrée du backlog reste ouverte, la session s'arrête et rapporte. S'il porte une AUTRE classe (par exemple `Timed out 7000ms waiting for expect(locator).toHaveURL`, D127, que D340 a relevée à côté de D265) : c'est **un autre défaut**, il **ne se corrige pas dans ce lot** (un lot, un objet) ; la session s'arrête et rapporte aussi.

## 6. Ce que cette règle NE fait PAS

- **Pas de troisième passe, quel que soit le résultat** : une passe de plus « pour voir » serait le rejeu que R-12 interdit.
- **Pas de passe pour verdir** : les deux doivent passer sans que rien n'ait bougé entre elles (le script vérifie l'arbre propre avant la seconde).
- **La passe des six portes de clôture rejouera `test:e2e` une troisième fois** (c'est sa sixième porte, `docs/preuves/D340/portes/passe-secteur.sh`). Un rouge à ce moment **arrête aussi** (D270 : aucun lot ne part dans `main` sous une porte rouge) : c'est la même règle, pas une exception, et la lecture adverse de la consigne l'a relevé (contrôle 4.3).
- **Elle ne certifie rien** : aucune marque n'est posée (pause de Ko, DR1 de D336).
