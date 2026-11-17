# D348 (suite) — le rejeu de la porte `test` : sa règle, écrite et commitée AVANT son lancement

Source : consigne « RANG 50 (SUITE) — LA PORTE `test` SE REJOUE UNE FOIS, LES JOURNAUX SE MASQUENT, PUIS ON POUSSE » (texte proposé par le relecteur le 16/11/2026, adopté par Ko tel quel), décision R-1. Cette pièce ne décide rien d'autre ; ce que la session **dérive** est marqué « ⚠ dérivé par la session, à ratifier ».

## 1. Ce qui est rejoué

La porte **`pnpm test`**, **ENTIÈRE** (`pnpm -r --workspace-concurrency=1 --no-bail run test`, comme à la première passe), **UNE fois**, sur secteur, par le pilote `docs/preuves/D348/portes/rejeu-test.sh`, sortie écrite **hors du dépôt** pendant la mesure (D270) puis versée.

- Arbre : celui de `HEAD` à la création de cette règle ; **aucun fichier de code ne diffère** de la première passe : `git diff 2b9a5e1..HEAD` ne contient que des `.md` et des pièces de `docs/preuves/D348/`. (Le code mesuré est celui de `411d373` / `ac728d8`.)
- ⚠ *Dérivé par la session, à ratifier* : seule la porte **`test`** est rejouée, pas les six. R-1 dit « rejeu de la porte `test` ENTIÈRE, UNE fois » ; les cinq autres portes sont sorties **0** à la première passe sur le même code, et rien ne les a modifiées depuis. Le pilote est la copie réduite de `docs/preuves/D340/portes/rejeu-portes.sh` (l'original rejoue `test` puis `test:e2e`) : l'écart est déclaré dans son en-tête.
- ⚠ *Dérivé par la session* : le pilote d'origine n'a pas de refus sur batterie ; **R-9 de D340** l'exige des portes de clôture. La copie ajoute ce refus (code 3, **avant** la porte) et refuse aussi si l'arbre n'est pas propre.

## 2. Lecture du résultat — fixée maintenant

**UNE seule passe.** Pas de rejeu du rejeu, pas de troisième passe.

- **VERT** = `pnpm test` sort en **0** **et** la sortie brute lue ne porte aucun échec : `Test Files` et `Tests` sans « failed » dans les résumés des paquets (lus, D275 — pas un code de sortie seul). Alors :
  - la porte est déclarée **« verte au rejeu, première passe rouge sur un fichier non touché »** ; les **deux sorties** (la rouge, `portes/test.txt`, et la rejouée, `portes/rejeu-test.txt`) sont versées côte à côte et lues dans `portes/lecture-rejeu.md` ;
  - la suite se déroule (R-2 à R-5, contrôle de fin de lot) et la clôture **se pousse**.
- **ROUGE, QUEL QU'IL SOIT** (code non nul, **ou** code 0 avec un échec dans la sortie) :
  - **rien n'est poussé** ; pas de rejeu ; la session s'arrête et rapporte, avec la répartition des échecs par fichier et la première ligne de chaque bloc d'échec (D304 : en tenant compte du regroupement) ;
  - R-2 à R-5 restent des écritures documentaires valables dans les deux cas ; elles sont commitées **en local**, non poussées (D276 : ce qui vaut décision vit dans un fichier).
- **PASSE NULLE** : si le poste bascule sur batterie pendant la passe (un échantillon « BATTERIE » dans `rejeu-etat-machine.txt`), la passe est **NULLE** (D290, R-9 de D340) — ni verte ni rouge ; la session ne la rejoue pas et s'arrête en le disant.

## 3. État machine relevé avant la passe — et ce que la règle en fait

À la reprise (16/11/2026) : alimentation **SECTEUR** (BatteryStatus 2, 100 %), `zwadj-db` **Up**, `headless_shell` **0**, ports d'e2e 3100 / 3101 / 5273 / 5274 **libres**, RAM libre **3 771 Mo** à la reprise, **8 processus `chrome`** — le Chrome personnel de Ko (processus d'arrière-plan, extensions, GPU : `chrome.exe --no-startup-window`, hors de cette session).

- La session **n'arrête aucun processus qui n'est pas le sien** ; `chrome` et la RAM sont des **relevés**, pas des conditions d'arrêt (R-9 de D340 ne définit que la batterie ; la porte `test` est une porte de tests unitaires, sans navigateur). C'est la même conduite que D340 (« `chrome` est un relevé »).
- Ces relevés **n'entrent dans aucune certification** : les certifications sont en pause (DR1 de D336) ; les règles « RAM au-dessus de la barre » et « `chrome` = 0 » sont celles d'une fenêtre de certification, que ceci n'est pas. ⚠ *Dérivé par la session, à ratifier* : si Ko ou le relecteur veulent le rejeu sous ces conditions-là, la passe attend.

## 4. Ce que cette règle ne dit pas — écrit pour ne pas se lire comme tenu

- **Un rejeu vert ne dit pas que le test est réparé** : il dit qu'il n'a pas échoué cette fois. Le fichier a échoué **une fois sur cinq** rejoué seul ; **le défaut intermittent reste ouvert** (entrée du backlog, annotation additive de R-3).
- **Un rejeu vert ne rattache pas le défaut à un lot** : l'attribution « antérieur à D348 » reste un argument de dépendance (aucun fichier commun), **non mesuré sur `26ad5c7`**. Les précédents D338 et D342 (première passe rouge, rejeu vert, arbre inchangé) la rendent plausible ; ils ne la mesurent pas.
- **La poussée n'est pas une certification** (en pause).
