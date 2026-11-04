# D340 — la passe sur SECTEUR : sa règle (R-8 de la note de Ko du 04/11/2026), écrite et commitée AVANT son lancement

Source : `docs/preuves/D340/note-ko-04-11.md` (la note, copiée telle que reçue). Cette pièce ne décide rien d'autre que ce que la note décide ; ce que la session **dérive** est marqué « ⚠ dérivé par la session, à ratifier ».

## 1. Ce que la note a décidé (R-7 à R-10), en une ligne chacun

- **R-7** — les deux passes du 03/11 au soir (première passe et rejeu) sont **NON CERTIFIANTES** (batterie, D290) : elles restent versées telles quelles et **ne décident rien, ni rouge ni vert**. La règle du rejeu commitée avant lui (`49cd9f9`) reste au dépôt : elle visait une mesure valable, et il n'y en a pas eu.
- **R-8** — **UNE passe** des six portes et de l'e2e, **sur secteur**, état machine relevé juste avant, toutes les 30 s pendant, juste après. **Cette règle est écrite et commitée AVANT le lancement.**
- **R-9** — règle générale, ajoutée à `AGENTS.md` sous le bloc D290 : une session qui trouve le poste sur batterie au moment des portes de clôture ne les lance pas.
- **R-10** — quel que soit le résultat sur secteur, l'entrée ouverte du backlog sur la garde des sorties console reçoit une annotation additive (forme D302) qui renvoie à la pièce.

## 2. Ce qu'est la passe

`docs/preuves/D340/portes/passe-secteur.sh`, lancé depuis la racine, sortie **hors du dépôt** pendant la mesure (D270), versée ensuite : `typecheck`, `lint`, `test`, `build`, `test:int`, `test:e2e`, **dans cet ordre, une fois chacun**, sur l'arbre de `HEAD` (aucun code ne diffère de la dernière passe verte sur secteur de D339 : `git diff ec44937..HEAD` ne contient que des `.md` d'autorité et des pièces de `docs/preuves/D340/`). `retries` de l'e2e reste à **0**. Le pilote **ne relance rien**.
**R-9 est appliquée par le pilote lui-même** : sur batterie, il refuse de lancer la moindre porte (code 3) et l'écrit. Il refuse aussi si le démon Docker ne répond pas, si `zwadj-db` n'est pas `Up`, si un port d'e2e est occupé ou si l'arbre n'est pas propre.
**État machine relevé** : juste avant (index), toutes les 30 s pendant (`etat-machine-pendant.txt`), juste après (index) : alimentation, RAM libre, `chrome`, `headless_shell`, `node`.

## 3. Conditions de VALIDITÉ — la passe n'est « une mesure » que si elles tiennent toutes

1. **Secteur au départ** (le pilote le garantit) **et zéro échantillon « BATTERIE » pendant la passe.** ⚠ *Dérivé par la session, à ratifier* : si le poste bascule sur batterie en cours de passe, la passe est **NULLE** — ni verte ni rouge —, la session **ne la rejoue pas** (« UNE passe ») et s'arrête en le disant : décider d'une seconde passe revient à Ko ou au relecteur.
2. **L'arbre propre et inchangé** : `git status --short` vide au départ et à l'arrivée ; aucune édition d'un fichier suivi pendant la passe (D270).
3. **Les sorties brutes sont LUES, pas comptées** (D275) : les résumés Vitest sont sommés sur les quatre paquets ; l'e2e se lit sur son résumé (`passed`, `failed`, `skipped`, `flaky`) ; un code de sortie 0 ne remplace pas la lecture, et un code non nul n'est pas encore une signature (D304).

## 4. Lecture du résultat — fixée maintenant

**TOUT VERT** = les six portes sortent en **0**, et leurs sorties brutes ne portent aucun échec (`failed` absent des résumés ; l'e2e : 0 `failed`, 0 `flaky`, les ignorés sont comptés et dits).
- La clôture **se pousse**. Les textes de clôture reçoivent une **annotation additive** : *les passes sur batterie sont non certifiantes, la passe sur secteur est verte*, **avec ses chiffres**. Le registre et l'ordre des rangs disent « **RANG 44 : OUVERT, CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE** » (R-8, mot pour mot). Les phrases « ROUGES » et « clôture NON POUSSÉE » des écritures du 03/11 sont **annotées** (barrées avec leur motif, jamais effacées), par une passe D277 des deux sens.
- Les sorties de la passe sont versées (l'e2e **masquée**, le contrôle « 0 valeur réelle » rejoué), après un audit de secrets scellé et son tri (D298, D299).
- Après la poussée : `git fetch`, local et `origin/main` **sur le même SHA**, le contrôle de fin de lot rejoué (D288) et versé dans `controle-fin-de-lot-secteur.txt`.

**UN ROUGE, QUEL QU'IL SOIT** — une porte à code de sortie non nul, **ou** une porte à code 0 dont la sortie brute porte un échec :
- **pas de push, pas de rejeu, pas de troisième passe** ; la session s'arrête et rapporte, **avec la répartition des échecs par fichier de test et la première ligne de chaque bloc d'échec** (D304 : la ligne qui suit l'en-tête `FAIL`, en tenant compte du regroupement des tests qui échouent de la même façon). Cette lecture est versée dans `portes/secteur/lecture-rouge.md`.
- ⚠ *Dérivé par la session, à ratifier* : « tu t'arrêtes » n'efface pas D276 — ce qui vaut décision ne vit pas seulement dans le fil. La session **versera et commitera EN LOCAL** les sorties de la passe et sa lecture, **sans les pousser**, **sans écrire la clôture** (ni annotation additive « verte », ni `RANG 44 : OUVERT…`), et le dira. R-9 et R-10, qui valent « quel que soit le résultat », sont écrites dans les deux cas.
- Si c'est de nouveau `walkin-journey.test.tsx` par une `AssertionError` (R-10) : même conduite, **arrêt**.

## 5. Ce que cette règle ne dit pas — écrit pour ne pas se lire comme tenu

- **L'état du poste à la réception de la note n'est pas celui que la note annonçait**, sur deux points (`portes/secteur/etat-machine-reception.txt`) : dix processus `chrome` sans fenêtre sont présents (la note : « Ko a fermé Chrome ») et Docker Desktop n'était pas lancé. La session n'arrête aucun processus qui n'est pas le sien ; elle a **lancé Docker Desktop** et **redémarré `zwadj-db`** (`pnpm db:up`), actions déclarées dans la pièce de réception. `chrome` est un **relevé**, pas une condition d'arrêt : la note ne définit comme condition d'arrêt que la batterie.
- **Une passe verte ne dit pas que le code est bon** : elle dit que, sur secteur, à cette date, les six portes et l'e2e passent sur l'arbre de `HEAD`. Elle ne remplace ni la lecture du relecteur, ni une certification (en pause : DR1 de D336).
- **Un rouge ne dit pas pourquoi.** La session ne propose aucune cause tant qu'elle ne l'a pas mesurée (D291).

## 6. Résultat de la passe

*(à compléter après la passe, par un commit postérieur à celui de cette règle)*
