"""D305 — OBSERVATION JETABLE d'une cible de `neutralize-solid-s5b.py` sous la forme (ii). PIÈCE, pas campagne : le
verdict de la cible reste celui du harnais.

POURQUOI : sous l'écriture conditionnelle, deux cibles de S5b perdent le cas que leur mesure exerçait —
S5b-2 (la relecture D117, MD-F1-8) et S5b-1 (le verrou de salle, MD-F1-5 : trouvée MUETTE par `lancer-campagnes.py`).
`neutralize-solid-s5b.py` ne garde aucune sortie : il dit « rouge » ou « vert », pas QUEL test rougit. Ce script pose
la MÊME mutation (ancre et remplacement IMPORTÉS du harnais, jamais recopiés), lance la même mesure, et GARDE la
sortie : on y lit quels titres échouent, et par quoi.
⚠ Première écriture : `observer-s5b2.py`, figé sur la cible 2 ; généralisé au rang de cible quand S5b-1 est tombée
muette (même lot, non commité entre les deux).

MODE D'EMPLOI, depuis la racine, base de développement lancée, AUCUNE autre campagne en cours :
    python3 docs/preuves/D305/outils/observer-s5b.py <rang de la cible, 1 à 5> <fichier de sortie>
⛔ Survit à un signal comme les harnais (D223) : sauvegarde disque AVANT mutation, restauration au démarrage.
"""
import importlib.util
import io
import os
import shutil
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-d305-s5b"


def restaurer_si_interrompu() -> None:
    if not os.path.isdir(SAUVEGARDE):
        return
    for marque in os.listdir(SAUVEGARDE):
        chemin = marque.replace("__", "/")
        io.open(chemin, "w", encoding="utf-8", newline="").write(
            io.open(os.path.join(SAUVEGARDE, marque), encoding="utf-8", newline="").read())
        print(f"↩ RESTAURÉ après interruption : {chemin}")
    shutil.rmtree(SAUVEGARDE)


def main(argv: list[str]) -> int:
    if len(argv) != 2 or not argv[0].isdigit():
        print("usage : observer-s5b.py <rang de la cible> <fichier de sortie>")
        return 2
    rang, sortie = int(argv[0]), argv[1]
    restaurer_si_interrompu()
    spec = importlib.util.spec_from_file_location("s5b", "neutralisation/neutralize-solid-s5b.py")
    h = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(h)
    cible = h.CIBLES[rang - 1]
    libelle, chemin, avant, apres, attendu, mesures = cible[:6]
    if not libelle.startswith(f"S5b-{rang}."):
        print(f"✗ la cible de rang {rang} n'est pas S5b-{rang} : {libelle[:60]}")
        return 2
    commande = h.MESURES[mesures[0]]
    source = io.open(chemin, encoding="utf-8", newline="").read()
    avant_, apres_ = avant.replace("\n", "\r\n"), apres.replace("\n", "\r\n")
    vus = source.count(avant_)
    print(f"cible : {libelle}")
    print(f"ancre : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
    if vus != attendu:
        return 2
    os.makedirs(SAUVEGARDE, exist_ok=True)
    marque = os.path.join(SAUVEGARDE, chemin.replace("/", "__"))
    io.open(marque, "w", encoding="utf-8", newline="").write(source)
    mute = source.replace(avant_, apres_)
    io.open(chemin, "w", encoding="utf-8", newline="").write(mute)
    # Relire le marqueur APRÈS (D286) : l'ancre a disparu, le remplacement est là.
    relu = io.open(chemin, encoding="utf-8", newline="").read()
    print(f"posée : ancre {relu.count(avant_)} (attendu 0) · remplacement {relu.count(apres_)} (attendu {source.count(apres_) + attendu})")
    try:
        r = subprocess.run([shutil.which(commande[0]) or commande[0], *commande[1:]], capture_output=True,
                           text=True, encoding="utf-8", errors="replace")
    finally:
        io.open(chemin, "w", encoding="utf-8", newline="").write(source)
        os.remove(marque)
        os.rmdir(SAUVEGARDE)
    restaure = io.open(chemin, encoding="utf-8", newline="").read() == source
    with io.open(sortie, "w", encoding="utf-8", newline="") as f:
        f.write(f"$ {' '.join(commande)}\n{r.stdout or ''}\n--- stderr ---\n{r.stderr or ''}\n--- code de sortie : {r.returncode} ---\n")
    print(f"code de sortie : {r.returncode} · sortie : {sortie} · source restaurée à l'identique : {restaure}")
    return 0 if restaure else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
