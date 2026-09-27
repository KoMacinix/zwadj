"""D316 — EXTRAIT VERSABLE d'un journal de travail (Playwright, vitest, campagne). Pièce versée, pas un instrument
promu. N'écrit que le fichier de destination qu'on lui nomme.

⚠ POURQUOI : les journaux e2e portent la sortie des serveurs de développement (`[WebServer] …`), dont des jetons de
vérification d'e-mail et des valeurs du cookie de rafraîchissement (audit du 09/09 ; D315). Ils ne se versent pas.
L'extrait retire ces lignes et les codes ANSI, et garde le reste tel quel ; l'empreinte du journal complet est
écrite en tête de l'extrait, pour que l'extrait se rattache à SON journal.
⚠ Les lignes se comptent par `splitlines()` — jamais `split("\\n")`, dont le `+1` a produit « 911 » pour 910 (D294).
Chaque extraction imprime ce qu'elle a parcouru, gardé, retiré (D290).
Usage, depuis la racine :  python docs/preuves/D316/outils/extraire.py <journal> <destination>
"""
import hashlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
source, destination = sys.argv[1], sys.argv[2]
brut = open(source, "rb").read()
texte = re.sub(r"\x1b\[[0-9;]*m", "", brut.decode("utf-8", errors="replace"))
lignes = texte.splitlines()
gardees = [l for l in lignes if not l.startswith("[WebServer]")]
entete = (f"# extrait de {source.replace(chr(92), '/')} · sha256 du journal complet {hashlib.sha256(brut).hexdigest()} · "
          f"{len(lignes)} lignes parcourues · {len(lignes) - len(gardees)} « [WebServer] » retirées · {len(gardees)} gardées\n")
corps = "\n".join(gardees)
# Contrôle qui PEUT échouer (un « parcourues = retirées + gardées » serait vrai par construction, D223) : ce qui porte
# une valeur sensible dans le journal doit avoir disparu de l'extrait. Les motifs viennent des deux contrôles
# « 0 valeur réelle » (D299 : jeton de vérification ; D315 : cookie de rafraîchissement).
sensibles = {"cookie zwadj_rt=": r"zwadj_rt=[^;\s\"']{8,}", "jeton ?token=": r"[?&]token=[A-Za-z0-9_\-.]{16,}"}
dans_journal = {n: len(re.findall(m, texte)) for n, m in sensibles.items()}
dans_extrait = {n: len(re.findall(m, corps)) for n, m in sensibles.items()}
open(destination, "w", encoding="utf-8", newline="\n").write(entete + corps + "\n")
print(f"{destination} : {len(lignes)} parcourues · {len(lignes) - len(gardees)} retirées · {len(gardees)} gardées · "
      f"valeurs sensibles : journal {dans_journal} → extrait {dans_extrait} (attendu 0 partout dans l'extrait)")
sys.exit(1 if any(dans_extrait.values()) else 0)
