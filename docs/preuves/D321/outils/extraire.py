"""D317 — EXTRAIT VERSABLE d'un journal de travail (Playwright, vitest, campagne). Pièce versée, pas un instrument promu.
Copie de la logique de `docs/preuves/D316/outils/extraire.py` (non importée : une pièce ne dépend pas d'une autre), avec une
seule différence : `--statut` GARDE, parmi les lignes du serveur (`[WebServer] …`), celles du COMPILATEUR ET DU DÉMARRAGE —
« File change detected », « Found N errors », « Starting compilation in watch mode », « Nest application successfully
started » — sans lesquelles la mesure de l'étape 1 n'a pas de pièce. Ces lignes ne portent ni jeton ni cookie ; le contrôle
ci-dessous le VÉRIFIE au lieu de le supposer.
⚠ POURQUOI : les journaux e2e portent la sortie des serveurs de développement, dont des jetons de vérification d'e-mail et
des valeurs du cookie de rafraîchissement (audit du 09/09 ; D315). Ils ne se versent pas. L'extrait retire ces lignes et
les codes ANSI, garde le reste tel quel, et porte en tête l'empreinte du journal complet.
⚠ Les lignes se comptent par `splitlines()`, jamais `split("\\n")` (D294). Chaque extraction imprime ce qu'elle a parcouru,
gardé, retiré (D290), et le compte des valeurs sensibles dans le journal ET dans l'extrait (attendu 0 dans l'extrait).
Usage, depuis la racine :  python docs/preuves/D317/outils/extraire.py [--statut] <journal> <destination>
"""
import hashlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
args = [a for a in sys.argv[1:] if a != "--statut"]
statut = "--statut" in sys.argv[1:]
if len(args) != 2:
    print("usage : extraire.py [--statut] <journal> <destination>")
    sys.exit(2)
source, destination = args
brut = open(source, "rb").read()
texte = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", brut.decode("utf-8", errors="replace"))
lignes = texte.splitlines()
GARDE = re.compile(r"File change detected|Found \d+ errors?|Starting compilation in watch mode|Nest application successfully started")


def garder(l: str) -> bool:
    if not l.startswith("[WebServer]"):
        return True
    return statut and bool(GARDE.search(l))


gardees = [l for l in lignes if garder(l)]
serveur_gardees = sum(1 for l in gardees if l.startswith("[WebServer]"))
entete = (f"# extrait de {source.replace(chr(92), '/')} · sha256 du journal complet {hashlib.sha256(brut).hexdigest()} · "
          f"{len(lignes)} lignes parcourues · {len(lignes) - len(gardees)} « [WebServer] » retirées · {len(gardees)} gardées"
          + (f" (dont {serveur_gardees} « [WebServer] » de statut du compilateur ou du démarrage)" if statut else "") + "\n")
corps = "\n".join(gardees)
sensibles = {"cookie zwadj_rt=": r"zwadj_rt=[^;\s\"']{8,}", "jeton ?token=": r"[?&]token=[A-Za-z0-9_\-.]{16,}"}
dans_journal = {n: len(re.findall(m, texte)) for n, m in sensibles.items()}
dans_extrait = {n: len(re.findall(m, corps)) for n, m in sensibles.items()}
open(destination, "w", encoding="utf-8", newline="\n").write(entete + corps + "\n")
print(f"{destination} : {len(lignes)} parcourues · {len(lignes) - len(gardees)} retirées · {len(gardees)} gardées"
      + (f" (dont {serveur_gardees} de statut)" if statut else "")
      + f" · valeurs sensibles : journal {dans_journal} → extrait {dans_extrait} (attendu 0 partout dans l'extrait)")
sys.exit(1 if any(dans_extrait.values()) else 0)
