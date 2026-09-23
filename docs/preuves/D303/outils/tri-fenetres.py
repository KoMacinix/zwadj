#!/usr/bin/env python3
"""TRI AU CONTEXTE des alertes de l'audit de la copie hors dépôt — D303. Lecture seule, rien n'est écrit hors stdout.
Depuis la RACINE : python3 docs/preuves/D303/outils/tri-fenetres.py <dossier de la copie extraite>
Pourquoi : `contextes_de` (instrument de D298) tronque la LIGNE à 200 caractères ; dans un rapport JSON d'une seule
ligne, la correspondance tombe au-delà et le contexte imprimé ne la montre pas. Ici : pour CHAQUE correspondance des
onze motifs, une fenêtre de 70 caractères de part et d'autre de la correspondance, blancs aplatis.
MASQUE, appliqué à la fenêtre AVANT impression : toute suite de 20 caractères ou plus de [A-Za-z0-9+/=_.-] devient
« <N car.> » — une valeur de secret ne sort donc jamais en clair ; un nom de variable long est masqué aussi (coût
accepté : on lit la nature, pas la valeur).
CALIBRATION, deux bras : un texte portant une valeur de 40 caractères derrière un nom secret suivi de deux-points (le
littéral est assemblé à l'exécution, leçon D291) ⇒ la fenêtre imprimée ne
contient PAS la valeur et contient « <40 car.> » ; un texte ordinaire ⇒ fenêtre inchangée. Un bras manqué ⇒ ABANDON.
Imprime le parcouru (fichiers, correspondances) à côté du total attendu, que l'instrument a rendu (70).
⛔ SA SORTIE RÉCITE DES CONTEXTES — MASQUÉS, MAIS DES CONTEXTES : versée telle quelle, elle serait un ÉCHO NON SCELLÉ,
la classe que le rang 18 a fermée (D298). Mesuré dans ce lot : 81 alertes nouvelles au tri différentiel, toutes dans
cette sortie. ⇒ Elle s'écrit par `--sortie <chemin>`, SCELLÉE par la fonction `sceller` de l'instrument, et
l'instrument l'exclut ensuite par son sceau — en imprimant les alertes qu'elle aurait rendues (D298)."""
import importlib.util
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO."); sys.exit(2)
spec = importlib.util.spec_from_file_location("audit_secrets_d298", "neutralisation/audit-secrets.py")
inst = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inst)
MASQUE = re.compile(r"[A-Za-z0-9+/=_.\-]{20,}")


def masquer(s):
    return MASQUE.sub(lambda m: f"<{len(m.group(0))} car.>", s)


def fenetre(texte, debut, fin):
    return masquer(re.sub(r"\s+", " ", texte[max(0, debut - 70):debut] + "⟦" + texte[debut:fin] + "⟧" + texte[fin:fin + 70]))


args = sys.argv[1:]
sortie = None
if "--sortie" in args:
    i = args.index("--sortie")
    sortie = args[i + 1]
    args = args[:i] + args[i + 2:]
lignes = []


def dire(s):
    print(s)
    lignes.append(s)


valeur = "Zw4dj" + "Q" * 35
pos = fenetre("x " + "sec" + "ret: " + valeur + " y", 2, 9)
neg = fenetre("un texte ordinaire, sans rien", 3, 8)
ok = valeur not in pos and "<40 car.>" in pos and neg == "un ⟦texte⟧ ordinaire, sans rien"
dire(f"CALIBRATION : positif — valeur absente {valeur not in pos}, masque présent {'<40 car.>' in pos} · négatif inchangé {neg == 'un ⟦texte⟧ ordinaire, sans rien'}")
if not ok:
    print("✗ ABANDON"); sys.exit(2)

racine = args[0]
fichiers, n = 0, 0
for base, dossiers, noms in os.walk(racine):
    dossiers.sort()
    for nom in sorted(noms):
        p = os.path.join(base, nom)
        rel = os.path.relpath(p, racine).replace(os.sep, "/")
        texte = open(p, "rb").read().decode("utf-8", errors="replace")
        fichiers += 1
        for cle, motif in inst.MOTIFS.items():
            for m in re.finditer(motif, texte, flags=re.IGNORECASE):
                n += 1
                ligne = texte.count("\n", 0, m.start()) + 1
                dire(f"[{n:3d}] {cle:22s} {rel}:{ligne}\n      {fenetre(texte, m.start(), m.end())}")
dire(f"== parcourus : {fichiers} fichiers · correspondances : {n} (attendu 70, le total de l'instrument)")
if sortie:
    scelle = inst.sceller("\n".join(lignes) + "\n")
    with open(sortie, "wb") as fh:
        fh.write(scelle)
    relu = open(sortie, "rb").read()
    print(f"sortie scellée : {sortie} ({len(relu)} octets) · relue identique : {relu == scelle} · sceau vérifié : {inst.sceau_valide(relu)}")
