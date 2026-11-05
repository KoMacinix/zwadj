#!/usr/bin/env python3
"""crlf-simule.py — joue UNE commande sur des fichiers ramenés TEMPORAIREMENT en CRLF, les fins de ligne du poste de Ko.

POURQUOI IL EXISTE (session `front-client`, FC-5). Ce conteneur extrait le dépôt en LF ; le poste de Ko a `core.autocrlf=true`
(AGENTS.md, D291 : « `core.autocrlf=true` sur ce poste »), donc ses fichiers sont en CRLF. Plusieurs harnais écrivent leurs ancres
multi-lignes en CRLF EN DUR — `L(...)` de `neutralize-404.py`, les `\\r\\n` de r30, available-on, horizon, maxprice. Ici ils
s'arrêtent en « ERREUR DE SCRIPT » sur du code sain, et les cibles qui suivent ne sont pas jouées ; surtout, une ancre qu'un lot
RÉORIENTE dans un tel harnais n'y est pas vérifiable — et une ancre fausse arrêterait la campagne de Ko à l'intégration.

CE QU'IL FAIT, dans cet ordre :
  1. restaure d'abord un état laissé par une exécution interrompue (manifeste sur DISQUE, écrit AVANT toute conversion) ;
  2. rejoue sa calibration (ci-dessous) et ABANDONNE si un bras manque son verdict ;
  3. pour chaque fichier nommé : refuse s'il contient déjà un « \\r » (l'aller-retour ne serait pas exact), relève son sha256,
     l'écrit au manifeste, puis LF → CRLF ;
  4. joue la commande, sa sortie passant telle quelle ;
  5. CRLF → LF, et revérifie que CHAQUE fichier a retrouvé son empreinte d'avant — sinon sortie 4, et le manifeste reste.
  Il imprime ce qu'il a parcouru (D290) : fichiers convertis, lignes converties, fichiers rendus à l'identique (attendu : tous).
  Sa sortie est celle de la commande, sauf 4 (restauration inexacte) et 3 (calibration manquée, ou fichier refusé).

CALIBRATION (deux bras, D286), rejouée à chaque lancement sur des fichiers TEMPORAIRES, hors du dépôt :
  · bras positif : une ancre écrite en CRLF est introuvable dans le fichier LF (0), trouvée après conversion (1) ;
  · bras négatif : l'aller-retour rend les MÊMES octets ; un fichier qui contient déjà un retour chariot est REFUSÉ.

INSTRUMENTS ÉCARTÉS : `git -c core.autocrlf=true checkout -- .` réécrirait TOUT l'arbre, y compris les fichiers modifiés non
commités du lot en cours ; un clone séparé n'a pas `node_modules`, les tests ne s'y jouent pas ; corriger les harnais pour qu'ils
normalisent leurs fins de ligne serait toucher des campagnes hors de ce lot.

USAGE (depuis la RACINE) :
    python3 docs/preuves/front-client/outils/crlf-simule.py <fichier>… -- <commande>…
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

MANIFESTE = os.path.join(".neutralisation-journaux", "crlf-simule", "manifeste.json")


def empreinte(octets: bytes) -> str:
    return hashlib.sha256(octets).hexdigest()


def lire(chemin: str) -> bytes:
    with open(chemin, "rb") as f:
        return f.read()


def ecrire(chemin: str, octets: bytes) -> None:
    with open(chemin, "wb") as f:
        f.write(octets)


def vers_crlf(chemin: str) -> int:
    octets = lire(chemin)
    if b"\r" in octets:
        raise ValueError(f"{chemin} contient déjà un retour chariot : l'aller-retour ne serait pas exact")
    ecrire(chemin, octets.replace(b"\n", b"\r\n"))
    return octets.count(b"\n")


def vers_lf(chemin: str) -> None:
    ecrire(chemin, lire(chemin).replace(b"\r\n", b"\n"))


def calibrer() -> bool:
    bras = []
    with tempfile.TemporaryDirectory() as dossier:
        p = os.path.join(dossier, "c.ts")
        ecrire(p, b"a\nb\nc\n")
        ancre = b"a\r\nb"
        bras.append(("positif : une ancre CRLF est introuvable dans le fichier LF", lire(p).count(ancre) == 0))
        avant = empreinte(lire(p))
        vers_crlf(p)
        bras.append(("positif : la même ancre est trouvée une fois après conversion", lire(p).count(ancre) == 1))
        vers_lf(p)
        bras.append(("négatif : l'aller-retour rend les mêmes octets", empreinte(lire(p)) == avant))
        q = os.path.join(dossier, "r.ts")
        ecrire(q, b"x\r\ny\n")
        try:
            vers_crlf(q)
            refuse = False
        except ValueError:
            refuse = True
        bras.append(("négatif : un fichier qui contient déjà un retour chariot est refusé", refuse))
    for nom, ok in bras:
        print(f"calibration {'✓' if ok else '✗'} {nom}")
    manques = sum(1 for _, ok in bras if not ok)
    print(f"calibration : {len(bras)} bras · {manques} manqué(s) (attendu 0)")
    return manques == 0


def restaurer_si_interrompu() -> None:
    if not os.path.isfile(MANIFESTE):
        return
    with open(MANIFESTE, encoding="utf-8") as f:
        entrees = json.load(f)
    for e in entrees:
        if empreinte(lire(e["chemin"])) == e["avant"]:
            continue
        lf = lire(e["chemin"]).replace(b"\r\n", b"\n")
        if empreinte(lf) != e["avant"]:
            print(f"✗ {e['chemin']} : ramené en LF, il ne retrouve pas son empreinte — un harnais interrompu doit d'abord se restaurer")
            sys.exit(4)
        ecrire(e["chemin"], lf)
    os.remove(MANIFESTE)
    print(f"↺ {len(entrees)} fichier(s) du manifeste rendu(s) en LF après une exécution interrompue.")


def main(argv: list[str]) -> int:
    if not os.path.isfile("pnpm-workspace.yaml"):
        print("✗ à lancer depuis la RACINE du monorepo (pnpm-workspace.yaml absent du dossier courant)")
        return 3
    if "--" not in argv:
        print(__doc__)
        return 3
    i = argv.index("--")
    fichiers, commande = argv[:i], argv[i + 1:]
    if not fichiers or not commande:
        print("✗ il faut au moins un fichier et une commande")
        return 3
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ calibration manquée : rien n'est converti")
        return 3
    for chemin in fichiers:
        if not os.path.isfile(chemin):
            print(f"✗ fichier introuvable : {chemin}")
            return 3
        if b"\r" in lire(chemin):
            print(f"✗ {chemin} contient déjà un retour chariot : refusé")
            return 3
    entrees = [{"chemin": c, "avant": empreinte(lire(c))} for c in fichiers]
    os.makedirs(os.path.dirname(MANIFESTE), exist_ok=True)
    with open(MANIFESTE, "w", encoding="utf-8") as f:
        json.dump(entrees, f, ensure_ascii=False)
    lignes = sum(vers_crlf(c) for c in fichiers)
    print(f"CRLF simulé : {len(fichiers)} fichier(s) convertis, {lignes} ligne(s)")
    sys.stdout.flush()
    sortie = subprocess.run(commande).returncode
    for c in fichiers:
        vers_lf(c)
    identiques = [e for e in entrees if empreinte(lire(e["chemin"])) == e["avant"]]
    print(f"rendus en LF à l'identique : {len(identiques)} sur {len(entrees)} (attendu {len(entrees)})")
    if len(identiques) != len(entrees):
        for e in entrees:
            if e not in identiques:
                print(f"✗ {e['chemin']} n'a pas retrouvé son empreinte")
        return 4
    os.remove(MANIFESTE)
    print(f"commande : sortie {sortie}")
    return sortie


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
