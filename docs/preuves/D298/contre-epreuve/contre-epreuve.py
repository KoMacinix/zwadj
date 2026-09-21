"""CONTRE-ÉPREUVE DE LA CALIBRATION DE `neutralisation/audit-secrets.py` (D298) — PROCÉDURE ARCHIVÉE
COMME PREUVE, jamais promue en instrument (D291).

Usage, depuis la racine : python3 docs/preuves/D298/contre-epreuve/contre-epreuve.py

POURQUOI. Une calibration qui passe ne dit pas qu'elle MORD : il faut la neutraliser et la voir
rougir (méthode du dépôt). Chaque cible ci-dessous remplace, dans une COPIE de l'instrument écrite
HORS DU DÉPÔT (dossier temporaire du système), un fragment qui fait tenir l'exclusion à l'identité
des octets ; la copie est jouée en `--calibration-seule` depuis la racine. Verdict exigé : code 2
(ABANDON) et le bras NOMMÉ marqué ✗. Aucun fichier du dépôt n'est modifié.
⚠ POURQUOI PAS UNE CAMPAGNE `neutralize-*.py` : `lancer-campagnes.py` ne retient que les chemins
en .ts/.tsx/.css/.json/.sql/.mjs ; une campagne qui ne vise qu'un .py y serait « aveugle » et le
ferait sortir en 1 à chaque passage. Rapporté au backlog par D298, non corrigé ici.
PREUVE DE POSE (D286) : pour chaque cible, l'ancre passe de 1 à 0 ET le marqueur de n à n + 1 dans
le texte muté — jamais une présence, jamais une taille.
PRÉ-VOL : la copie NON mutée, jouée par le même mécanisme, doit sortir en 0 avec tous ses bras ✓ —
sinon un rouge dirait quelque chose du mécanisme et rien de la garde.
"""
import os
import subprocess
import sys
import tempfile

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)

SOURCE = "neutralisation/audit-secrets.py"
CIBLES = [
    ("M1", "exclusion par EMPLACEMENT : le chemin épinglé suffit, l'empreinte n'est plus vérifiée",
     "            if hashlib.sha256(octets).hexdigest() == h:\n",
     "            if True:\n",
     "discrimination"),
    ("M2", "exclusion par NOM : un fichier nommé comme une sortie d'audit est exclu",
     "        elif sceau_valide(octets):\n",
     "        elif sceau_valide(octets) or chemin.rsplit(\"/\", 1)[-1].startswith(\"audit-secrets\"):\n",
     "discrimination"),
    ("M3", "sceau PRÉSENT au lieu de sceau VÉRIFIÉ",
     "        elif sceau_valide(octets):\n",
     "        elif SCEAU.search(octets.decode(\"utf-8\", errors=\"replace\")):\n",
     "discrimination"),
    ("M4", "aucune exclusion des prédécesseurs : le registre est vide",
     "    index = {c: (h, producteur) for c, h, producteur in EPINGLEES}\n",
     "    index = {}\n",
     ["écho"]),
    ("M5", "exclusion par EXTENSION : les journaux .log ne sont plus audités",
     "        elif sceau_valide(octets):\n",
     "        elif sceau_valide(octets) or chemin.endswith(\".log\"):\n",
     ["positif", "cas"]),
]
CIBLES = [(c, q, a, r, b if isinstance(b, list) else [b]) for c, q, a, r, b in CIBLES]


def jouer(texte: str) -> tuple:
    fd, chemin = tempfile.mkstemp(prefix="contre-epreuve-audit-", suffix=".py")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            f.write(texte)
        r = subprocess.run([sys.executable, chemin, "--calibration-seule"], capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        return r.returncode, r.stdout + r.stderr
    finally:
        os.remove(chemin)


original = open(SOURCE, encoding="utf-8", newline="").read()
if "\r\n" in original:
    print("✗ l'instrument est en CRLF : les ancres, écrites en \\n, ne trouveraient rien (fantôme)")
    sys.exit(2)

code, sortie = jouer(original)
ok = code == 0 and "✗" not in sortie and sortie.count("   ✓") == 5
print(f"{'✓' if ok else '✗'} pré-vol : copie NON mutée, code {code} (attendu 0), bras ✓ {sortie.count('   ✓')} (attendu 5)")
if not ok:
    print(sortie)
    sys.exit(2)

mordues = 0
for cle, quoi, ancre, remplacement, bras in CIBLES:
    n_ancre, n_marque = original.count(ancre), original.count(remplacement)
    mute = original.replace(ancre, remplacement)
    pose = n_ancre == 1 and mute.count(ancre) == 0 and mute.count(remplacement) == n_marque + 1
    if not pose:
        print(f"✗ {cle} NON POSÉE : ancre {n_ancre} → {mute.count(ancre)} (attendu 1 → 0), marqueur {n_marque} → "
              f"{mute.count(remplacement)} (attendu {n_marque} → {n_marque + 1})")
        continue
    code, sortie = jouer(mute)
    rouge = [l.split()[1] for l in sortie.splitlines() if l.startswith("   ✗")]
    # « cas réel » s'imprime en deux mots : le premier seul est relevé, d'où « cas » dans l'attendu.
    mord = code == 2 and rouge == bras and "ABANDON" in sortie
    mordues += mord
    print(f"{'✓' if mord else '✗'} {cle} — {quoi} : ancre 1 → 0, marqueur {n_marque} → {n_marque + 1} · code {code}"
          f" (attendu 2) · bras ✗ {rouge} (attendu {bras})")
print(f"\n{mordues} garde(s) mordue(s) sur {len(CIBLES)} cible(s).")
sys.exit(0 if mordues == len(CIBLES) else 1)
