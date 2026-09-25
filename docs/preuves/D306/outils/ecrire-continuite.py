# D306 — écriture dans `ZWADJ_CONTINUITE.md`, SEUL fichier d'autorité de ce lot (périmètre fixé par la consigne).
# Forme D289 : tout le texte vit dans CE fichier ou dans la section lue sur disque ; rien ne traverse un
# interpréteur de commande. Chaque ancre est COMPTÉE avant (exactement 1), chaque marqueur RELU après.
# Le fichier est en CRLF (relevé en octets) : tout texte inséré est converti en CRLF avant écriture.
# Usage, depuis la racine :  python docs/preuves/D306/outils/ecrire-continuite.py <section-d306.md>
import sys

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")

CHEMIN = "ZWADJ_CONTINUITE.md"
section = open(sys.argv[1], encoding="utf-8").read().replace("\r\n", "\n").rstrip("\n") + "\n\n"
brut = open(CHEMIN, "rb").read()
assert brut.count(b"\r\n") == brut.count(b"\n"), "fichier non homogène en CRLF"
t = brut.decode("utf-8").replace("\r\n", "\n")

EDITS = [
    # 1. point d'entrée du rang 23 — titre
    ("⛔ 23a CODÉ LE 25/09/2026 (D305) — ATTEND LA SESSION ADVERSE ; COMPTEUR À UN**",
     "⛔ 23a CODÉ LE 25/09/2026 (D305) — ~~ATTEND LA SESSION ADVERSE~~ ; COMPTEUR À UN ⛔ SESSION ADVERSE FAITE LE "
     "25/09/2026 (D306) — 23a ATTEND LA DÉCISION DU RELECTEUR**"),
    # 2. point d'entrée — sous-titre
    ("### ⛔ L'ÉTAT DU RANG, À LIRE EN PREMIER — rafraîchi le 25/09/2026 (D305)",
     "### ⛔ L'ÉTAT DU RANG, À LIRE EN PREMIER — rafraîchi le 25/09/2026 (D305, puis D306)"),
    # 3. point d'entrée — ligne 23a de la table
    ("⏸ **attend la session ADVERSE** (forme de revue, D302 : une autre session, à froid, tente de le casser et "
     "rapporte), puis la décision du relecteur ; veto de Ko |",
     "~~⏸ **attend la session ADVERSE** (forme de revue, D302 : une autre session, à froid, tente de le casser et "
     "rapporte), puis la décision du relecteur~~ ⛔ *(D306 : session adverse **FAITE** — section D306 : rouge rejoué, "
     "sept gardes neutralisées à la main, toutes mordent ; **cinq gardes rapportées**, C1 à C5 ; aucun comportement "
     "faux relevé)* ⏸ **attend la décision du relecteur** sur ce rapport ; veto de Ko |"),
    # 4. point d'entrée — « ce qui vient ensuite »
    ("⇒ **Ce qui vient ensuite, par la forme de revue** : la **session adverse de 23a** — elle ne code\n"
     "rien, elle rejoue et rapporte ; son mode d'emploi est au rapport de fin de lot de D305 et dans la section D305 (fichiers,\n"
     "cibles, titres, commandes).",
     "~~⇒ **Ce qui vient ensuite, par la forme de revue** : la **session adverse de 23a** — elle ne code\n"
     "rien, elle rejoue et rapporte ; son mode d'emploi est au rapport de fin de lot de D305 et dans la section D305 (fichiers,\n"
     "cibles, titres, commandes).~~ ⛔ *(D306, 25/09/2026 : la session adverse est **faite**, section D306. ⇒ **Ce qui\n"
     "vient ensuite : la DÉCISION DU RELECTEUR (chat)** sur son rapport — quatre gardes que la suite laisse passer et une\n"
     "qui ne mord qu'au code (C1 à C5), et un constat sur les pièces de D305 ; Ko garde le veto. Compteur : UN.)*"),
    # 5. ordre des rangs — ligne D305, et la ligne D306 qui la suit
    ("ouvert** ; 23a attend la session adverse puis le relecteur. ⇒ **Où il en est** : point d'entrée du rang 23.\n"
     "⇒ **RANG 24 : EN ATTENTE D'ARBITRAGE DE KO**",
     "ouvert** ; ~~23a attend la session adverse puis le relecteur~~ ⛔ *(D306 : session adverse faite — ligne suivante)*. "
     "⇒ **Où il en est** : point d'entrée du rang 23.\n"
     "⛔ **(D306, 25/09/2026) RANG 23 — SESSION ADVERSE DE 23a, lot DOCUMENTAIRE** (forme de revue de D302 ; périmètre\n"
     "d'écriture fixé par Ko : `docs/preuves/D306/` et ce fichier) : rouge rejoué indépendamment ; les sept gardes neuves ou\n"
     "réorientées neutralisées à la main, **toutes mordent** ; modes du § 2 rejoués, sonde hors suite ; **cinq gardes\n"
     "rapportées** (C1 à C5 : quatre que la suite laisse passer, une qui ne mord qu'au code) ; **aucun comportement faux\n"
     "relevé** ; aucun correctif proposé. **Compteur de lots de code non certifiés : UN, inchangé.** ⇒ **Le rang reste\n"
     "ouvert** ; 23a attend la **décision du relecteur** sur ce rapport, veto de Ko. ⇒ **Où il en est** : point d'entrée du\n"
     "rang 23.\n"
     "⇒ **RANG 24 : EN ATTENTE D'ARBITRAGE DE KO**"),
    # 6. ordre des rangs — annotation de la passe D277 de D305 sous la ligne du rang 24
    ("⚠ Que R1 s'ouvre avant la fin de cette revue n'est écrit nulle part : **à Ko** — point d'entrée.)*",
     "⚠ Que R1 s'ouvre avant la fin de cette revue n'est écrit nulle part : **à Ko** — point d'entrée.)*\n"
     "⛔ *(D306, 25/09/2026 — passe D277 : la session adverse est **faite** ; la revue ne l'est pas — 23a attend la décision\n"
     "du relecteur. Que R1 s'ouvre avant cette décision n'est toujours écrit nulle part : **à Ko**.)*"),
    # 7. la section D306, juste au-dessus de celle de D305 (ordre antichronologique des sessions)
    ("## Session du 25/09/2026 — D305 · rang 23 (reste ouvert), sous-lot 23a",
     section + "## Session du 25/09/2026 — D305 · rang 23 (reste ouvert), sous-lot 23a"),
]

for i, (a, b) in enumerate(EDITS, 1):
    n = t.count(a)
    if n != 1:
        sys.exit(f"ÉDITION {i} : ancre trouvée {n} fois (attendu 1) — RIEN N'EST ÉCRIT")
    t = t.replace(a, b)

# 8. le registre : une ligne ajoutée APRÈS la dernière (D305)
DERNIERE = "| D305 | A | D305 — rang 23 (reste ouvert), sous-lot 23a, CODE, CHEMIN DE L'ARGENT"
assert t.rstrip("\n").split("\n")[-1].startswith(DERNIERE), "la dernière ligne du registre n'est pas D305"
t = t.rstrip("\n") + "\n" + (
    "| D306 | A | D306 — rang 23 (reste ouvert), SESSION ADVERSE de 23a (forme de revue de D302), lot DOCUMENTAIRE : "
    "rouge rejoué indépendamment sur les sources de 6e87430 posées puis restaurées (T1, T2, T3 en AssertionError ; U1, U2 "
    "en TypeError, attendu) ; les sept gardes neuves ou réorientées neutralisées à la main par des mutations écrites par la "
    "session, aucune ancre importée — 7 morsures lues ; S5b-1 et S5b-2 muettes sans T5 / T4 (inférences de D305 "
    "reproduites) ; modes du § 2 rejoués ; sonde hors suite, 14 cas (interblocage forcé : accept victime ⇒ 500 ; après un "
    "compte 0 obtenu en attendant, la ligne reste verrouillée et la relecture lit l'état qui a fait échouer l'écriture ; "
    "writableFrom ≡ décision sur 120 couples) ; CASSE, cinq gardes : C1 prédicat de l'annulation client élargi à DECLINED, "
    "C2 code choisi sans le statut relu, C3 relecture de transition, C4 statut du 400 — 48/48 verts chacune — et C5 MD-F5-2 "
    "qui ne mord que par supertest ; chacune observable par la sonde ; aucun comportement faux relevé ; lecture adverse de "
    "D305 : les sorties de la campagne rang23 comptée aux portes n'étaient pas versées (copiées et lues ici, 5 sur 5) ; "
    "aucun correctif proposé ; compteur UN inchangé ; 23a attend la décision du relecteur ; rang 24 en attente "
    "d'arbitrage de Ko |\n"
)

out = t.replace("\n", "\r\n").encode("utf-8")
open(CHEMIN, "wb").write(out)

# Relecture : les marqueurs attendus sont DANS LE FICHIER, pas dans le compte rendu de ce script.
relu = open(CHEMIN, "rb").read()
r = relu.decode("utf-8")
marqueurs = [
    "SESSION ADVERSE FAITE LE 25/09/2026 (D306) — 23a ATTEND LA DÉCISION DU RELECTEUR**",
    "rafraîchi le 25/09/2026 (D305, puis D306)",
    "⏸ **attend la décision du relecteur** sur ce rapport ; veto de Ko |",
    "vient ensuite : la DÉCISION DU RELECTEUR (chat)**",
    "⛔ **(D306, 25/09/2026) RANG 23 — SESSION ADVERSE DE 23a, lot DOCUMENTAIRE**",
    "⛔ *(D306, 25/09/2026 — passe D277 : la session adverse est **faite**",
    "## Session du 25/09/2026 — D306 · rang 23 (reste ouvert), SESSION ADVERSE de 23a",
    "| D306 | A | D306 — rang 23 (reste ouvert), SESSION ADVERSE de 23a",
]
manques = 0
for m in marqueurs:
    n = r.count(m)
    manques += n != 1
    print(f"{'✓' if n == 1 else '✗'} {n} (attendu 1) · {m[:90]}")
print(f"octets {len(brut)} → {len(relu)} · CRLF {relu.count(b'\r\n')} · LF {relu.count(b'\n')} (attendus égaux) · "
      f"marqueurs manquants {manques} (attendu 0)")
print(f"dernière ligne : {r.rstrip().split(chr(10))[-1][:60]}")
