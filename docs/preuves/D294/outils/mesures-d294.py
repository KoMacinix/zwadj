"""Re-derive TOUTES les quantites que la section D294 cite. Une seule piece, rejouable.

Usage, depuis la racine : python docs/preuves/D294/outils/mesures-d294.py

POURQUOI UN SEUL SCRIPT
  D291 : les preuves brutes qu'une decision cite entrent au depot, sinon la decision n'est pas
  verifiable. Les mesures de ce lot avaient ete prises par des commandes jetables ; une commande
  jetable ne se rejoue pas, et la session suivante ne peut ni la contester ni distinguer un
  ecart de machine d'un ecart d'instrument (D286). Ce fichier les rend toutes rejouables.

CE QU'IL NE FAIT PAS
  Il n'imprime AUCUNE valeur de jeton. Le journal e2e porte 24 jetons de verification d'e-mail
  de 43 caracteres : on les COMPTE, on ne les montre jamais. Une piece qui exposerait un secret
  pour prouver qu'un secret existe serait le defaut qu'elle documente.

CALIBRATION, DEUX BRAS, REJOUEE A CHAQUE INVOCATION (D286)
  Chaque bloc porte son cas connu. ABANDON des qu'un verdict est manque.
"""
import io
import os
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

echecs = []


def verdict(nom, mesure, attendu, ok):
    etat = "OK " if ok else "ECHEC"
    if not ok:
        echecs.append(nom)
    print("   %-5s %-46s mesure=%-28s attendu=%s" % (etat, nom, mesure, attendu))


print("== 1. LES CINQ CONFIGURATIONS DE TEST — qui declare un budget ?")
CONFIGS = ["apps/api/vitest.config.ts", "apps/api/vitest.config.int.ts",
           "apps/client/vitest.config.ts", "packages/api-client/vitest.config.ts",
           "apps/pro/vite.config.ts"]
declarants = []
for c in CONFIGS:
    txt = io.open(c, encoding="utf-8").read()
    n = txt.count("testTimeout")
    print("   %-44s testTimeout x%d" % (c, n))
    if n:
        declarants.append(c)
verdict("configs examinees", len(CONFIGS), 5, len(CONFIGS) == 5)
verdict("configs qui declarent un budget", declarants,
        "['apps/api/vitest.config.int.ts'] seule", declarants == ["apps/api/vitest.config.int.ts"])

print("\n== 2. LE JETON DE VERIFICATION N'EST JAMAIS PERSISTE EN CLAIR")
schema = io.open("apps/api/prisma/schema.prisma", encoding="utf-8").read()
bloc = schema[schema.index("model EmailVerificationToken"):]
bloc = bloc[:bloc.index("}") + 1]
verdict("EmailVerificationToken : 'tokenHash'", bloc.count("tokenHash"), ">= 1",
        bloc.count("tokenHash") >= 1)
# bras negatif : un champ en clair ne doit PAS exister
en_clair = re.findall(r"^\s+token\s+String", bloc, re.MULTILINE)
verdict("EmailVerificationToken : champ 'token' en clair", len(en_clair), 0, len(en_clair) == 0)

print("\n== 3. UN SEUL FOURNISSEUR LIE AU PORT EMAIL_SENDER")
mod = io.open("apps/api/src/common/email/email.module.ts", encoding="utf-8").read()
verdict("email.module.ts : 'useClass'", mod.count("useClass"), 1, mod.count("useClass") == 1)
verdict("email.module.ts : '@Global()'", mod.count("@Global()"), 1, mod.count("@Global()") == 1)

print("\n== 4. AUCUNE SPEC e2e NE LIT UN JETON DE VERIFICATION")
# ⚠ node_modules EXCLU. Premiere execution : 204 fichiers et 1 171 'token' — le balayage
#   descendait dans les dependances. Le verdict (0 'verification-email') tenait, mais le bras
#   de calibration ne mesurait plus ce qu'il pretendait : « le mot token est present dans NOS
#   specs » devenait « ... quelque part dans les dependances ». On sait ce qu'on compte, ou on
#   ne compte pas (D290). Sortie d'origine gardee : mesures-d294-sortie-AVANT-EXCLUSION.txt
# calibration : le mot 'token' EST present dans nos specs (tokens CSS de b7) — sinon la
#   recherche est morte et son 0 ne vaut rien.
vus_token = 0
vus_verif = 0
fichiers_e2e = 0
for racine, dossiers, noms in os.walk("e2e"):
    dossiers[:] = [d for d in dossiers if d != "node_modules"]
    for nom in noms:
        if not nom.endswith(".ts"):
            continue
        fichiers_e2e += 1
        t = io.open(os.path.join(racine, nom), encoding="utf-8", errors="replace").read()
        vus_token += t.lower().count("token")
        vus_verif += t.count("verification-email")
verdict("fichiers e2e examines (hors node_modules)", fichiers_e2e, ">= 1", fichiers_e2e >= 1)
verdict("occurrences de 'token' (calibration : tokens CSS de b7)", vus_token, ">= 1", vus_token >= 1)
verdict("occurrences de 'verification-email' dans nos specs", vus_verif, 0, vus_verif == 0)

print("\n== 5. LE JOURNAL e2e : 910 LIGNES, 24 JETONS — AUCUNE VALEUR IMPRIMEE")
jrn = ".neutralisation-journaux/rang15-e2e.log"
if os.path.exists(jrn):
    brut = open(jrn, "rb").read()
    txt = brut.decode("utf-8", errors="replace")
    verdict("dernier octet du journal", repr(brut[-1:]), "b'\\n'", brut[-1:] == b"\n")
    verdict("lignes par splitlines()", len(txt.splitlines()), 910, len(txt.splitlines()) == 910)
    verdict("lignes par split(chr(10)) — l'idiome fautif", len(txt.split("\n")), 911,
            len(txt.split("\n")) == 911)
    verdict("occurrences de 'verification-email?token='",
            txt.count("verification-email?token="), 24, txt.count("verification-email?token=") == 24)
else:
    print("   ⚠ JOURNAL ABSENT DU DISQUE — il est hors depot (ignore par git) et peut avoir ete")
    print("     efface. Les quantites ci-dessus ne sont PAS reproductibles depuis le depot seul :")
    print("     c'est exactement le motif de la regle des preuves (D291) et de l'elargissement")
    print("     de l'extrait arbitre le 16/09/2026 (critere du rang 9, point 9).")

print("\n== 6. L'IDIOME .split(chr(10)) DANS LES INSTRUMENTS VERSES")
motif = 'split("' + chr(92) + 'n")'
porteurs = []
examines = 0
for racine, _, noms in os.walk("docs/preuves"):
    for nom in sorted(noms):
        if not nom.endswith(".py"):
            continue
        chemin = os.path.join(racine, nom).replace(os.sep, "/")
        examines += 1
        if motif in io.open(chemin, encoding="utf-8", errors="replace").read():
            porteurs.append(chemin)
verdict("instruments .py examines", examines, ">= 1", examines >= 1)
for p in porteurs:
    marque = "   <-- CE SCRIPT : il porte le motif parce qu'il le CHERCHE" \
        if p.endswith("mesures-d294.py") else ""
    print("      porteur : %s%s" % (p, marque))
# ⚠ CE SCRIPT SE COMPTE LUI-MEME, et c'est ecrit plutot que retranche : il contient le motif
#   parce qu'il le cherche. Famille « une garde mesure la DOCUMENTATION de ce qu'elle teste »,
#   deja rencontree deux fois a D291 et une fois a D293 (l'audit dont le compte monte quand on
#   ecrit sa trouvaille). Retrancher en silence donnerait un chiffre juste et une piece qui
#   ment sur ce qu'elle a parcouru.
porteurs_hors_soi = [p for p in porteurs if not p.endswith("mesures-d294.py")]
verdict("porteurs, CE SCRIPT COMPRIS", len(porteurs), ">= 1", len(porteurs) >= 1)
verdict("porteurs, hors ce script", len(porteurs_hors_soi), 5, len(porteurs_hors_soi) == 5)

print("\n== 7. LA REPARATION DE apps/pro/vite.config.ts EST EN PLACE")
vite = io.open("apps/pro/vite.config.ts", encoding="utf-8").read()
verdict("'cette borne' present", vite.count("cette borne"), ">= 1", vite.count("cette borne") >= 1)
doubles = len(re.findall(r"//.*\w  \w", vite))
verdict("double espace en commentaire", doubles, 0, doubles == 0)
try:
    log = subprocess.run(["git", "log", "--oneline", "-1", "--", "apps/pro/vite.config.ts"],
                         capture_output=True, text=True, encoding="utf-8").stdout.strip()
    print("      dernier commit du fichier : %s" % log)
except Exception as err:  # pragma: no cover
    print("      (git indisponible : %s)" % err)

print("\n== 8. FINS DE LIGNE DES FICHIERS D'AUTORITE — en OCTETS, jamais par grep")
for f in ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md", "CLAUDE.md"]:
    b = open(f, "rb").read()
    crlf = b.count(b"\r\n")
    lf = b.count(b"\n") - crlf
    verdict("%s : LF nus" % f, lf, 0, lf == 0)
    print("         (CRLF=%d · octets=%d)" % (crlf, len(b)))

print("\n== ECHECS : %d (attendu 0)" % len(echecs))
for e in echecs:
    print("   - %s" % e)
if echecs:
    sys.exit("ABANDON : une mesure citee par D294 ne se reproduit pas")
print("== ✓ toutes les quantites citees par D294 se reproduisent.")
