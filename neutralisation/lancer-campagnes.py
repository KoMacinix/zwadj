#!/usr/bin/env python3
"""Joue les campagnes de neutralisation CONCERNÉES par les fichiers modifiés.

⛔ POURQUOI CE SCRIPT EXISTE PLUTÔT QU'UNE RÈGLE À SE RAPPELER (D269).
D268 a réécrit une ligne de `quote-store.prisma.ts` qui servait d'ANCRE à une
cible de `neutralize-s10b.py`. La campagne s'est arrêtée dessus, cinq cibles
n'ont pas été jouées, et **aucune des six portes ne l'a dit**. La réponse
proposée était d'ajouter une règle de méthode (« le périmètre d'un lot inclut
les campagnes qui lisent les lignes qu'il touche »). ⛔ Ko l'a REJETÉE, et le
motif est solide : **une règle écrite dans un document s'oublie** — D226 disait
déjà « relancer les campagnes après toute inversion de décision », elle était
écrite, et elle n'a pas été appliquée. Le geste de fin de lot est donc ce
MÉCANISME, pas un rappel.

⛔ POURQUOI CE SCRIPT EXISTE AUSSI PLUTÔT QU'UN COMPTEUR ÉCRIT QUELQUE PART.
`AGENTS.md` a porté « 18 scripts, 149 cibles », puis « 19 scripts, 165 cibles ».
Les deux étaient faux au moment où on les lisait. Un chiffre figé sur une
quantité mouvante se recopie de rapport en rapport bien après avoir cessé d'être
vrai. **L'état courant se MESURE**, il ne se lit pas dans un document.

⚠ COMMENT LE TRI EST FAIT, ET CE QU'IL NE GARANTIT PAS.
Chaque campagne est lue, et TOUTE chaîne littérale qui désigne un fichier
EXISTANT du dépôt est retenue comme fichier qu'elle mute ou mesure. Ce balayage
large est délibéré : deux campagnes (`available-on`, `available-on-api`)
n'écrivent AUCUNE constante de chemin — un détecteur qui ne lirait que les
constantes les raterait **en silence**, et un tri qui rate est pire qu'un tri
absent. Mesuré au 30/08 : 22 campagnes sur 22 rendent au moins un fichier.
⛔ Si une campagne rend ZÉRO fichier, elle ne peut JAMAIS être sélectionnée :
le script le DIT bruyamment au lieu de la passer sous silence.

⛔ EN SÉRIE, JAMAIS EN PARALLÈLE : chaque campagne MUTE des fichiers sources du
dépôt. Deux campagnes concurrentes se marcheraient dessus et produiraient des
rouges sans aucun rapport avec ce qu'elles mesurent.

⚠ CE SCRIPT NE JUGE PAS, IL RELÈVE — et le tri vaut plus que le total :
  1 = garde MUETTE (mutation non détectée : vrai problème) ;
  2 = pré-vol déjà rouge, ou ERREUR DE SCRIPT (ancre périmée par un lot) ;
  3 = campagne INCOMPLÈTE (cibles hors exécution, D248).
⚠ Une sortie 2 sur « ERREUR DE SCRIPT » signifie que la campagne s'est
ARRÊTÉE : les cibles suivantes n'ont PAS été jouées. Une campagne partiellement
jouée n'est pas une campagne verte.

⚠ DEUX FORMATS DE RÉSUMÉ COEXISTENT, et les confondre fait perdre la moitié du
compte (vécu) : les scripts récents écrivent « N garde(s) mordue(s) sur M
cible(s) », les anciens « N garde(s) neutralisée(s) et ROUGE(s) ». On COMPTE
donc les lignes de verdict plutôt que de croire le résumé — un script arrêté en
cours n'en écrit aucun.

Usage :
    python3 neutralisation/lancer-campagnes.py          # fin de LOT : les concernées
    python3 neutralisation/lancer-campagnes.py --tout   # LIVRAISON : les 22 (~40 min)
    python3 neutralisation/lancer-campagnes.py --liste  # n'exécute rien, montre le tri
Depuis : la racine du monorepo.
"""
import glob
import io
import os
import re
import subprocess
import sys
import time

# ⛔ La console Windows est en cp1252 et ferait LEVER ce script sur son premier
#   « ✓ » — le défaut même corrigé dans les 22 harnais par D268.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    sys.exit(2)

# ⚠ Dossier IGNORÉ PAR GIT (motif `.neutralisation-*/`). La première version de
#   ce script écrivait ses journaux dans la RACINE du dépôt : 22 fichiers
#   `campagne-*.log` versionnables au milieu du diff de livraison.
JOURNAUX = ".neutralisation-journaux"

CHEMIN = re.compile(r"""['"]([^'"\n]+\.(?:ts|tsx|css|json|sql|mjs))['"]""")
MORDUES = re.compile(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible")
ROUGES = re.compile(r"(\d+) garde\(s\) neutralis..e\(s\) et ROUGE\(s\)")


def campagnes() -> list[str]:
    moi = os.path.basename(__file__)
    return [p for p in sorted(glob.glob("neutralisation/*.py")) if os.path.basename(p) != moi]


def fichiers_lus(script: str) -> set[str]:
    """Fichiers du dépôt que cette campagne mute ou mesure."""
    source = io.open(script, encoding="utf-8").read()
    return {c.replace("\\", "/") for c in CHEMIN.findall(source) if os.path.isfile(c)}


def modifies() -> set[str]:
    """Tout ce qui a bougé depuis HEAD, suivi ou non.

    ⚠ `git diff --name-only` SEUL ne voit ni l'index ni les fichiers neufs : un
    lot dont les changements sont déjà `git add`és passerait au travers du tri,
    silencieusement. On prend donc `HEAD` comme référence, plus les fichiers non
    suivis."""
    def sortie(*args: str) -> list[str]:
        r = subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8")
        return [l.strip().replace("\\", "/") for l in r.stdout.splitlines() if l.strip()]

    return set(sortie("diff", "--name-only", "HEAD")) | set(
        sortie("ls-files", "--others", "--exclude-standard")
    )


def lancer(script: str) -> tuple[int, str]:
    r = subprocess.run(
        [sys.executable, script], capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    return r.returncode, f"{r.stdout or ''}\n{r.stderr or ''}"


def main(argv: list[str]) -> int:
    tout = "--tout" in argv
    liste_seule = "--liste" in argv

    toutes = campagnes()

    # ⛔ UNE CAMPAGNE SANS FICHIER DÉTECTÉ NE PEUT JAMAIS ÊTRE SÉLECTIONNÉE.
    #   La signaler est le minimum : un tri qui rate en silence est pire qu'un
    #   tri absent, parce qu'il donne l'assurance d'avoir regardé.
    aveugles = [p for p in toutes if not fichiers_lus(p)]
    for p in aveugles:
        print(f"⛔ {p} : AUCUN fichier détecté — cette campagne ne sera JAMAIS")
        print("   sélectionnée automatiquement. Corriger le script ou le tri.")

    if tout:
        retenues, touches = toutes, set()
    else:
        touches = modifies()
        retenues = [p for p in toutes if fichiers_lus(p) & touches]
        print(f"{len(touches)} fichier(s) modifié(s) depuis HEAD "
              f"→ {len(retenues)} campagne(s) concernée(s) sur {len(toutes)}.")
        for p in retenues:
            communs = sorted(fichiers_lus(p) & touches)
            print(f"  · {os.path.basename(p)}  ({len(communs)} fichier(s) en commun)")
            for c in communs[:3]:
                print(f"      {c}")
        if not retenues:
            print("  (aucune — mais ce n'est PAS une preuve de livraison :")
            print("   avant de livrer, relancer avec --tout.)")

    if liste_seule:
        return 0
    if not retenues:
        return 1 if aveugles else 0

    os.makedirs(JOURNAUX, exist_ok=True)
    lignes = []
    t0 = time.time()

    for i, script in enumerate(retenues, start=1):
        debut = time.time()
        print(f"\n[{i}/{len(retenues)}] {script} …", flush=True)
        code, sortie = lancer(script)
        io.open(os.path.join(JOURNAUX, os.path.basename(script) + ".log"),
                "w", encoding="utf-8").write(sortie)

        mordues = len([l for l in sortie.splitlines() if l.startswith("✓ ") and "vol" not in l])
        muettes = len([l for l in sortie.splitlines() if l.startswith("✗ ")])
        non_mes = len([l for l in sortie.splitlines() if "NON MESUR" in l and ":" in l])
        m = MORDUES.search(sortie) or ROUGES.search(sortie)
        lignes.append((script, code, m.group(1) if m else "—", mordues, muettes,
                       non_mes, round(time.time() - debut)))
        print(f"    sortie={code}  {mordues} mordue(s), {muettes} muette(s)/erreur(s), "
              f"{non_mes} non mesurée(s)", flush=True)

    print("\n" + "=" * 96)
    print(f"{'campagne':34s} {'sortie':>6s} {'décl':>5s} {'mord':>5s} {'muet':>5s} {'nonm':>5s} {'sec':>5s}")
    print("=" * 96)
    t_mord = t_muet = t_nonm = 0
    for script, code, decl, mord, muet, nonm, duree in lignes:
        print(f"{os.path.basename(script):34s} {code:>6d} {decl:>5s} {mord:>5d} "
              f"{muet:>5d} {nonm:>5d} {duree:>5d}")
        t_mord, t_muet, t_nonm = t_mord + mord, t_muet + muet, t_nonm + nonm
    print("=" * 96)
    print(f"MESURÉ : {t_mord} garde(s) mordue(s) · {t_muet} muette(s)/erreur(s) · "
          f"{t_nonm} non mesurée(s) · {len(retenues)} campagne(s) · {round(time.time() - t0)}s")
    print(f"journaux : {JOURNAUX}/ (ignoré par git)")
    if not tout:
        print("⚠ TRI PARTIEL — avant une LIVRAISON, relancer avec --tout.")

    fautives = [(s, c) for s, c, *_ in lignes if c != 0]
    for script, code in fautives:
        print(f"  ⚠ {script} → sortie {code}")
    # ⚠ Ne rend 0 que si TOUT a été joué et TOUT a mordu.
    return 1 if (t_muet or t_nonm or fautives or aveugles) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
