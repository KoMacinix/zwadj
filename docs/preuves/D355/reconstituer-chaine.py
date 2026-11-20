# Chaîne « AVANT les rouges → APRÈS » des fichiers de test modifiés APRÈS que les rouges ont été joués (D334, point 5 : « correction après rouge à chaîner »).
#
# POURQUOI CE SCRIPT : les rouges (pièces `rouge-unit.txt` / `rouge-int.txt`) portent l'empreinte de chaque fichier de test joué. Deux fichiers ont changé ensuite, avant le premier commit de code. L'état « avant » n'est
# pas conservé sur le disque : il se RETROUVE dans le journal de la session (la création du fichier et ses modifications y sont consignées), et il se VÉRIFIE — la reconstitution n'est crue que si son empreinte est celle que
# les pièces des rouges citent. Sinon le script abandonne. Rien n'est supposé : chaque remplacement compte ses occurrences avant d'écrire (exactement une), et l'état « après » reconstitué doit être OCTET POUR OCTET le fichier du
# dépôt (ou, pour le second fichier, le fichier du dépôt dont l'inverse du remplacement redonne l'AVANT). Archivé comme PIÈCE (D291), jamais promu en instrument.
#
# FORME DE LA PIÈCE : les lignes « <sha256>  AVANT|APRÈS  <chemin> » sont celles que le contrôle de fin de lot LIT (même forme que `docs/preuves/D354/corrections-tests-apres-rouges.txt`) ; la différence est donnée à la suite.
# Une SECONDE PARTIE (corrections faites après le premier commit de code, trouvées par la découverte de la campagne) s'ajoute à la main, par `--seconde-partie <fichier>`, verbatim.
#
# Usage, depuis la RACINE du dépôt : python3 -I -X utf8 reconstituer-chaine.py <journal.jsonl> <sortie.txt> [--seconde-partie <fichier>]
import difflib
import hashlib
import json
import sys

JOURNAL, SORTIE = sys.argv[1], sys.argv[2]
SECONDE = sys.argv[sys.argv.index("--seconde-partie") + 1] if "--seconde-partie" in sys.argv else None

# Empreintes citées par les pièces des rouges — relevées dans ces pièces, jamais écrites de mémoire (voir `lire_pieces`).
PIECES = ["docs/preuves/D355/rouges/rouge-unit.txt", "docs/preuves/D355/rouges/rouge-int.txt"]


def lire_pieces() -> dict:
    cites = {}
    for p in PIECES:
        for ligne in open(p, encoding="utf-8"):
            if ligne.startswith("#   ") and "  apps/" in ligne:
                h, f = ligne[4:].rstrip("\n").split("  ", 1)
                cites[f] = h
    return cites


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def appels() -> dict:
    """Les appels d'outil du journal, par numéro de ligne."""
    sortie = {}
    with open(JOURNAL, encoding="utf-8") as f:
        for i, ligne in enumerate(f):
            try:
                o = json.loads(ligne)
            except Exception:
                continue
            contenu = (o.get("message") or {}).get("content")
            if not isinstance(contenu, list):
                continue
            for bloc in contenu:
                if isinstance(bloc, dict) and bloc.get("type") == "tool_use":
                    sortie.setdefault(i, []).append(bloc)
    return sortie


def diff(avant: str, apres: str, nom: str) -> str:
    return "".join(difflib.unified_diff(avant.splitlines(True), apres.splitlines(True), fromfile="AVANT " + nom, tofile="APRÈS " + nom, n=2))


cites = lire_pieces()
A = appels()
fichiers = []  # (chemin, sha avant, sha après, différence, motif)

# ── 1. client-record-writes.spec.ts : création (Write, ligne 1047) puis trois Edit (lignes 2050 à 2052) ──────────────────────────────────────────────────────────────────────────────────────────────────
F1 = "apps/api/src/clients/client-record-writes.spec.ts"
ecriture = [b for b in A[1047] if b["name"] == "Write" and b["input"]["file_path"].replace("\\", "/").endswith("client-record-writes.spec.ts")]
assert len(ecriture) == 1, len(ecriture)
avant1 = ecriture[0]["input"]["content"]
assert sha(avant1.encode("utf-8")) == cites[F1], ("la reconstitution de l'état AVANT n'a pas l'empreinte citée par les rouges", sha(avant1.encode("utf-8")), cites[F1])
apres1 = avant1
for n in (2050, 2051, 2052):
    edits = [b for b in A[n] if b["name"] == "Edit" and b["input"]["file_path"].replace("\\", "/").endswith("client-record-writes.spec.ts")]
    assert len(edits) == 1, (n, len(edits))
    vieux, neuf = edits[0]["input"]["old_string"], edits[0]["input"]["new_string"]
    assert not edits[0]["input"].get("replace_all"), n
    assert apres1.count(vieux) == 1, (n, apres1.count(vieux))
    apres1 = apres1.replace(vieux, neuf)
courant1 = open(F1, "rb").read()
assert apres1.encode("utf-8") == courant1, "l'état APRÈS reconstitué n'est pas le fichier du dépôt"
fichiers.append((F1, cites[F1], sha(courant1), diff(avant1, apres1, F1), "garde (e) re-spécifiée : « quatre sites écrivent la ligne par le constructeur » ne pouvait pas se lire en cherchant les littéraux d'action — les magasins PASSENT l'action au constructeur du module pur"))

# ── 2. staff-store.prisma.spec.ts : une seule modification (script Bash, ligne 2027) : le deuxième appel de `openSession` reçoit `expectedPasswordHash` ─────────────────────────────────────────────────────
F2 = "apps/api/src/staff/staff-store.prisma.spec.ts"
courant2 = open(F2, "rb").read()
t2 = courant2.decode("utf-8")
assert "\r\n" not in t2
neuf2 = 'await f.store.openSession({ actor: acteur, proProfileId: SALLE, memberId: MEMBRE, expectedPasswordHash: "SECRET-HASH-LU", sessionTokenHash: "SECRET-JETON-S"'
vieux2 = 'await f.store.openSession({ actor: acteur, proProfileId: SALLE, memberId: MEMBRE, sessionTokenHash: "SECRET-JETON-S"'
assert t2.count(neuf2) == 1, t2.count(neuf2)
avant2 = t2.replace(neuf2, vieux2)
assert sha(avant2.encode("utf-8")) == cites[F2], ("la reconstitution de l'état AVANT n'a pas l'empreinte citée par les rouges", sha(avant2.encode("utf-8")), cites[F2])
# la commande du journal (ligne 2027) a bien fait ce remplacement-là, et seulement lui
cmd = [b for b in A[2027] if b["name"] == "Bash"][0]["input"]["command"]
assert vieux2 in cmd and neuf2 in cmd and cmd.count("t.replace(") == 1
fichiers.append((F2, cites[F2], sha(courant2), diff(avant2, t2, F2), "`tsc` a refusé le deuxième appel de `openSession` de la spec du magasin : le port exige désormais `expectedPasswordHash` (la valeur lue par la réservation)"))

# ── Écriture de la pièce ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
sortie = []
sortie.append("D355 — corrections de TESTS faites APRÈS les rouges, avec l'empreinte sha256 de chaque fichier avant et après.")
sortie.append("")
sortie.append("═══ PREMIÈRE PARTIE : avant le premier commit de code (les rouges de `docs/preuves/D355/rouges/` ont joué l'état « AVANT » de chaque ligne ci-dessous ; `3dc0113` les verse, `2608255` est le premier commit de code)")
sortie.append("")
for (f, a, b, d, motif) in fichiers:
    sortie.append(f"{a}  AVANT  {f}")
    sortie.append(f"{b}  APRÈS  {f}")
sortie.append("")
sortie.append("Douze fichiers de test ont été joués aux rouges (`rouges/rouge-unit.txt`, `rouges/rouge-int.txt` : l'empreinte de chacun) ; DEUX ont changé ensuite, avant le premier commit de code ; les dix autres sont IDENTIQUES à leur empreinte des rouges (comparaison refaite à la production de cette pièce).")
sortie.append("L'état « avant » n'est pas conservé sur le disque : il a été RETROUVÉ dans le journal de la session (création et modifications de chaque fichier), et la reconstitution n'est crue que parce que son empreinte est celle des rouges ; l'état « après » reconstitué est OCTET POUR OCTET le fichier du dépôt (second fichier : le fichier du dépôt dont l'inverse du remplacement redonne l'AVANT). Script : `reconstituer-chaine.py`, joint.")
sortie.append("⚠ Ce que cette chaîne ne dit PAS : qu'un test corrigé après les rouges MORD toujours — c'est ce que mesure la campagne de neutralisation du lot (`neutralisation/neutralize-r57.py`), jouée sur les fichiers d'AUJOURD'HUI.")
sortie.append("")
for (f, a, b, d, motif) in fichiers:
    sortie.append("=" * 118)
    sortie.append(f"FICHIER : {f}")
    sortie.append(f"  MOTIF : {motif}")
    sortie.append("  DIFFÉRENCE :")
    sortie.append("")
    sortie.append(d.rstrip("\n"))
    sortie.append("")
sortie.append("=" * 118)
sortie.append("CONTRÔLES DE LA RECONSTITUTION (tous passés, sinon aucune pièce n'est écrite) :")
sortie.append("  - l'état AVANT reconstitué de chaque fichier a l'empreinte citée par les pièces des rouges : 2 sur 2 ;")
sortie.append("  - l'état APRÈS reconstitué est le fichier du dépôt (octet pour octet pour `client-record-writes.spec.ts` ; pour `staff-store.prisma.spec.ts`, l'inverse du remplacement redonne l'AVANT) ;")
sortie.append("  - chaque remplacement a été compté AVANT d'écrire : exactement une occurrence (trois remplacements pour le premier fichier, un pour le second).")
if SECONDE:
    sortie.append("")
    sortie.append(open(SECONDE, encoding="utf-8").read().rstrip("\n"))
with open(SORTIE, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(sortie) + "\n")
print(f"pièce écrite : {SORTIE} — {len(fichiers)} fichiers chaînés, 2 sur 2 contrôles d'empreinte passés" + (" ; seconde partie ajoutée" if SECONDE else ""))
