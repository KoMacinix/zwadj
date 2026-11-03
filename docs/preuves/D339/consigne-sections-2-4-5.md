# D339 — rang 43 — les sections 2, 4 et 5 de la consigne du 28/10/2026, mot pour mot

**Provenance.** Note de Ko pour la reprise en cours de D339, **02/11/2026** (texte proposé par le relecteur, adopté par Ko tel quel), **point 3** : « LES SECTIONS 2, 4 ET 5 DE LA CONSIGNE DU 28/10/2026, mot pour mot ci-dessous : tu n'as pas à les reconstruire. […] Le texte des trois sections entre en pièce (docs/preuves/D339/consigne-sections-2-4-5.md), déclaré par une extension seule et versé après l'audit. »

**Ce que cette pièce corrige de `docs/preuves/D339/reprise/etat.md`, § 7** (versé le 30/10/2026, commit `9aa574f`) : la limite qu'il écrivait — « le texte des sections 4 et 5 de la consigne d'origine du 28/10 n'est pas au dépôt » — est **levée** ; la liste qu'il avait **reconstruite** de l'ordre des commits de la table et des renvois est à **confronter** à ce texte (la session de reprise le fait dans la section D339 de `ZWADJ_CONTINUITE.md`). La pièce d'état n'est pas retouchée : elle reste datée (D291, D295).

**Ce qui est cité, et ce qui ne l'est pas.** Le texte entre les deux filets ci-dessous est celui de la note, **sans une lettre changée**. Les sections 1 et 3 de la consigne ne sont pas dans cette pièce : la section 1 est écrite dans `ZWADJ_CONTINUITE.md` (première écriture d'autorité, `52c24e6`) ; la section 3 (3 a, 3 b, 3 c) est exécutée par `17207e4` et `c781fe8`.

---

2. DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO
- R-1. La révision ne choisit pas le drapeau. quoteReviseSchema n'accepte pas isOfficial (clé inconnue, 400) ; le drapeau est hérité de la dernière version de la chaîne (D-7 du cadrage). Une révision d'un brouillon qui porte une fiche ou un nom est refusée avant toute écriture : le geste est la promotion. Motif : quoteReviseSchema = quoteCreateSchema (packages/types/src/quote.ts:408) ; sans cette règle, une révision ferait d'une chaîne officielle, déjà remise, un brouillon v2, par une ligne neuve que la CHECK accepte.
- R-2. La création : isOfficial: false avec une fiche ou un nom est refusé (400). Motif : Q2 (a), refusé par le contrat avant la base.
- R-3. K-5 (la copie du nom, apps/api/src/venues/quotes.controller.ts:168-185) refuse un brouillon (409, code et message FR et AR fixés au complément du cadrage) ; l'écran ne demande que la langue au téléchargement d'un brouillon. Motif : K-5 écrit la copie du nom sur un devis SANS fiche (apps/api/src/venues/quote-store.prisma.ts:316-323 : la fiche n'est lue que si client_record_id n'est pas NULL) ; la boîte de langue demanderait le nom manquant et le poserait sur le brouillon.
- R-4. Le déclencheur porte sur INSERT ET sur UPDATE de quote_id. Motif : une réservation existante rattachée après coup à un brouillon passerait un déclencheur limité à l'INSERT.
- R-5. Une garde de plus pour le filigrane : le PDF d'un brouillon a le MÊME nombre de pages que le même devis sans filigrane, en FR et en AR. Motif : le relecteur a rejoué le spike de D338 avec un autre Chromium (headless_shell 1243) et retrouvé les six lignes à l'identique ; la mutation `absolute` y fait passer le document de 4 à 3 pages, donc un filigrane mal posé change la mise en page. Cause non établie (hypothèse : réduction à la largeur de la page) ; seul le nombre de pages est mesuré.

4. LE LOT
- Le cadrage de D338 (sections 2 à 5) et son complément (3 b) font la liste des contrats, des écrans et des modes de défaillance. Un mode de défaillance qui n'y est pas ne se code pas (D126).
- La migration : is_official, la CHECK étendue (1 b), le déclencheur (1 e, R-4). Testée sur base non vide (D123) : devis existants dans chaque état et réservations existantes intacts, ligne à ligne. Si ta lecture contredit la tranche ou ces extensions : NE MIGRE PAS, rapporte l'écart (DR8) et attends.
- La promotion : une transaction, la dernière version, le compte = 1 exigé, UNE ligne d'audit sans nom, ni numéro, ni e-mail (S-81) ; première écriture de audit_logs.
- HORS LOT, inchangés : NB-6 ; le paiement en ligne (E3) ; les notifications (L36-9) ; Q4 (b) (entrée 3 a) ; la révision d'une version ancienne (entrée ouverte de D338) ; la garde des sorties console (entrée ouverte).
- Tests : rouges avant le code (D334, item 5) ; harnais neutralize-r43 (--int pour la base) ; e2e : un brouillon créé au comptoir par le bouton de Q1, refusé à la remise, promu, puis remis ; parité FR = AR.

5. FIN DE LOT
- Contrôle de fin de lot (D288, D328) AVANT le dernier commit : premier commit = table seule ; lecture adverse avant tout .md d'autorité ; rouges avant le code ; diff ⊆ table ; local = origin/main après push puis fetch.
- Six portes et e2e, rejoués après la dernière modification. Ni certification ni marque. Compteur pour mémoire : DEUX → TROIS.
- Toute écriture sur la base de développement de Ko : déclarée (règle d'AGENTS.md).
- Ordre des rangs : « RANG 43 : CLOS SUR LE CODE », puis « RANG 44 : EN ATTENTE D'ARBITRAGE DE KO ».
- Rubrique « Patrons ». Gestes de Ko (10 lignes au plus), dont : regarder en FR et en AR qu'un brouillon de plusieurs pages garde ses montants lisibles sous le filigrane (S-82 : sa lisibilité ne se mesure pas).
- Rapport en français : fait, pas fait, écarts (une phrase chacun), décisions prises seul à ratifier (une phrase simple chacune DANS le rapport, avec ce qu'elle change pour Ko), au plus une question. Une session, un lot.

---
