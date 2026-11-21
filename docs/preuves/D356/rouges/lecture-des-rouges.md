# D356 — lecture des rouges (versés AVANT le premier commit de code ; D334, item 5)

**Ce qui a été joué** : les fichiers de test du lot, contre l'arbre dont le code de production est CELUI D'AVANT le lot (aucune ligne de production du lot n'était encore écrite) : `jouer-rouges.py` (copie adaptée de la pièce de D355), trois familles — `unit` (dix fichiers de `apps/api`), `client` (le client d'API), `int` (sept fichiers d'intégration sur PostgreSQL réel). **L'empreinte sha256 de CHAQUE fichier de test joué, et de ses aides, est en tête de chaque sortie brute.** La sortie est lue par `lire-rouges.py` (copie adaptée de la pièce de D355), **calibrée à chaque lancement** sur les deux sorties connues de D355 (19 `AssertionError` + un fichier tombé à la collecte ; 20 `AssertionError`) : les deux cas ont rendu leur verdict. Les lectures sont `lecture-rouge-*.txt`.

## 1. Les trois passes de la famille « intégration » (une faute de MES tests, corrigée, gardée)

| passe | sortie | résultat | lecture |
|---|---|---|---|
| **1** | `passe-1/rouge-int.txt` | 7 fichiers en échec ; **2 tests en échec · 9 passés (11)** ; **6 fichiers tombés à la collecte** | **défaut de mes tests** : l'aide `staff-helpers.ts` importait le hacheur du PIN (un module qui n'existe pas) — donc TOUS les fichiers qui l'importent tombaient à la collecte, et les rouges par assertion étaient masqués. Corrigé : l'oracle du haché est calculé par `node:crypto` DANS l'aide (`hacherPin`, le HMAC-SHA-256 à la main avec le secret de test), indépendant du code testé. Les deux seuls tests qui espionnent le hacheur l'importent dans le test lui-même. |
| **2** | `passe-2/rouge-int.txt` | **64 en échec · 33 passés (97)** : 37 `AssertionError`, 23 `TypeError`, 1 `PrismaClientKnownRequestError`, 3 « import introuvable » | **seconde faute de mes tests** : onze `TypeError` venaient d'un matcher (`.toMatch`) appelé sur un PIN `null` — une `TypeError` du matcher, pas une assertion. Corrigé : l'aide `pinRendu` exige le PIN par une assertion native d'abord (`toBeTypeOf("string")`). |
| **finale** | `rouge-int.txt` | **64 en échec · 33 passés (97)** : **48 `AssertionError`, 12 `TypeError`, 1 `PrismaClientKnownRequestError`, 3 « import introuvable »** | la lecture qui fait foi. |

Les familles « unitaire » et « client » n'ont pas changé entre les passes (leurs fichiers de test n'ont pas été touchés) : leurs sorties finales sont les seules versées.

## 2. Ce que les rouges disent, par famille

| famille | échecs | par classe de première ligne | fichiers tombés à la collecte |
|---|---|---|---|
| unitaire (`apps/api`) | **75 en échec · 305 passés (380)**, 10 fichiers | **30 `AssertionError` · 45 `TypeError`** | **2** (`staff-pin.spec.ts`, `staff-pin-hasher.spec.ts` : les modules n'existent pas) |
| client d'API | **2 en échec · 10 passés (12)** | 1 `AssertionError` (la liste des dix contrats) · 1 `TypeError` (`pinLogin` n'est pas une fonction) | 0 |
| intégration | **64 en échec · 33 passés (97)**, 7 fichiers | **48 `AssertionError` · 12 `TypeError` · 1 erreur Prisma · 3 « import introuvable »** | 0 |

## 3. Les prédictions de `regle-portes.md` § 1, confrontées (écrites avant ; une prédiction contredite se lit comme telle, D291)

| prédiction | mesuré | verdict |
|---|---|---|
| MP-12 (le secret) : rouge par `AssertionError` | `env.spec.ts` : **5 `AssertionError`** (le secret absent, trop court, absent en production par la LISTE, la valeur rendue, le message qui ne recopie pas la valeur) | ✓ tenue |
| MP-10 (le générateur) et le hacheur : tombés à la collecte | **2 fichiers tombés** | ✓ tenue |
| R-4 (l'état du PIN) : `TypeError` | **8 `TypeError`** | ✓ tenue |
| le contrat et le client : `TypeError` ou collecte ; la parité ne rougit qu'une fois une clé écrite | 7 `TypeError` (le schéma de K-23, indéfini) · **4 `AssertionError`** dont la liste des clés du levier, la `CHECK` confrontée à la constante absente, les trois clés de message, la liste des dix contrats du client | ✓ tenue, avec quatre rouges par assertion de plus que prédit |
| K-23 par la route (MP-1, MP-2, MP-3, MP-15, MP-26, MP-27, MP-28) : rouge par assertion (404) | **la majorité par `AssertionError`** (« expected 404 to be 200 », etc.) ; **deux exceptions** : le test des NEUF causes (il importe le hacheur pour l'espionner : « import introuvable ») et l'ACCORD entre la règle pure et le prédicat SQL (il appelle `reservePinAttempt` sur le magasin : `TypeError`) | **contredite en partie** : deux tests ne PEUVENT pas rougir par assertion contre un code qui n'a ni le module ni la méthode |
| l'émission et l'effacement (K-14, K-15, K-18, K-21, K-22) : rouge par assertion — « les rouges de DÉFAUT du lot » | **par `AssertionError`** pour tous sauf **deux** : le test de l'échéance de l'appareil à l'activation (`TypeError` : son test déréférence `pin_expires_at`, nul aujourd'hui) et le test de la `CHECK` (erreur Prisma : la constante du levier n'existe pas, le paramètre vaut `NULL`) | **contredite en partie** : deux tests d'absence, dont un défaut d'écriture de mon test (un déréférencement non gardé) que le lot ne corrige pas — l'absence est réelle |
| les quatre courses de R-3 : rouges d'ABSENCE par `TypeError` (les méthodes du magasin n'existent pas) | **`TypeError`** pour le témoin positif et les six entrelacements ; **« import introuvable »** pour les deux tests de MP-1 par la route (ils importent le hacheur pour l'espionner) | ✓ tenue, avec un second type d'absence (l'import) pour MP-1 |
| R-5 (le journal) : rouge par assertion ; le journal RÉEL n'est pas un rouge | les cinq tests de lignes et les trois échecs forcés : **`AssertionError`** ; les deux tests du journal réel/de l'audit : `TypeError` à la passe 2 (corrigé : `pinRendu`), **`AssertionError`** à la finale | ✓ tenue après la correction de la passe 2 |
| R-6 (`quote.promote`) : rouge pour le Manager et l'employé ; **VERT** couche éteinte | **2 `AssertionError`** (le Manager, l'employé) ; le test « couche éteinte » et celui de « la promotion ne change pas » **ne figurent PAS parmi les échecs** : ils sont verts dès aujourd'hui | ✓ tenue — le témoin vert est ce que le dire annonçait |
| le débit (`staffPin`) et la liste fermée : rouge par assertion | le 429 : **`AssertionError`** ; la liste des cinq routes exemptées (deux tests de `staff-session-guard`) : **`AssertionError`** ; **les DÉFAUTS de production** des trois clés : `TypeError` (la clé n'existe pas) | ✓ tenue, avec un test d'absence |
| **d'ensemble : « la majorité des rouges de ce lot sont des rouges d'ABSENCE »** | unitaire : **60 %** d'absence (45 `TypeError` sur 75, plus 2 fichiers) ; **intégration : 25 %** (16 sur 64 : 12 `TypeError`, 1 Prisma, 3 imports) — **la majorité est par ASSERTION** | **contredite pour l'intégration, tenue pour l'unitaire** : c'est ce que les comportements d'une route existante (K-14, K-15, K-18, K-21, K-22, `quote.promote`) permettent |

## 4. Ce que ces rouges ne prouvent PAS (écrit pour ne pas se lire comme tenu)

- **Un rouge d'absence prouve que le test ne passe pas à vide, pas qu'une garde mord.** La morsure est celle de la neutralisation de `neutralize-r58.py`. **Seuls les rouges par assertion sur un comportement d'une route qui EXISTE** (K-14, K-15, K-18, K-21, K-22, `quote.promote` : « l'état d'avant ne fait pas ce que la consigne demande ») sont des rouges de DÉFAUT.
- **Les 33 tests verts d'intégration et les 305 d'unitaire sont ceux qui existaient** (le limiteur existant, la liste d'avant, les témoins) : ils ne mesurent rien du lot, sauf deux témoins écrits pour rester verts (`quote.promote` couche éteinte, et « la promotion ne change pas »).
- **Aucun fichier de test n'a été modifié entre la passe finale et le premier commit de code** : l'empreinte de chacun est dans l'en-tête des sorties ; toute correction ultérieure est DÉCLARÉE avec ses deux empreintes (D355). **Il y en aura** : les tests du magasin d'`activate`, `openSession`, `changePassword`, `resetMemberPassword` et `disableMember` assertent la SÉQUENCE exacte des instructions SQL, qui change PAR CONCEPTION (le PIN s'écrit dans les mêmes instructions) ; ils sont corrigés après le code et déclarés (`corrections-tests-apres-rouges.txt`), jamais affaiblis.
