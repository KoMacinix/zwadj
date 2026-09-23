"""Prémisse du motif de F8 (D303) — « drapeau éteint, la fabrique sélectionne UnavailablePaymentGateway, et aucune
réponse Chargily n'atteint l'adaptateur ». Ko : « Vérifie cette prémisse dans payment-gateway.factory.ts. Si elle est
fausse, n'écris pas cette décision. » Lecture seule, sur les fichiers SUIVIS à HEAD (git grep), jamais le disque seul.
Depuis la racine : python3 docs/preuves/D303/releves/premisse-f8.py
Chaque vérification imprime le mesuré à côté de l'attendu (D290), et le parcouru."""
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def gg(*args):
    r = subprocess.run(["git", "grep", "-n", *args], capture_output=True, text=True, encoding="utf-8")
    return [l for l in r.stdout.splitlines() if l]


def show(chemin):
    return subprocess.run(["git", "show", f"HEAD:{chemin}"], capture_output=True, text=True, encoding="utf-8").stdout


ok = True


def verif(nom, mesure, attendu, detail=""):
    global ok
    bon = mesure == attendu
    ok &= bon
    print(f"{'✓' if bon else '✗'} {nom} : {mesure} (attendu {attendu}){' · ' + detail if detail else ''}")


suivis = subprocess.run(["git", "ls-files", "apps/api/src"], capture_output=True, text=True, encoding="utf-8").stdout.split()
print(f"== parcourus : {len(suivis)} fichiers suivis sous apps/api/src à HEAD")
fab = show("apps/api/src/payments/payment-gateway.factory.ts").splitlines()
corps = [l.strip() for l in fab if l.strip() and not l.strip().startswith(("//", "*", "/**"))]
i_drapeau = next((i for i, l in enumerate(corps) if l.startswith("if (!settings.PAYMENTS_ENABLED) return new UnavailablePaymentGateway();")), None)
i_cle = next((i for i, l in enumerate(corps) if "CHARGILY_SECRET_KEY" in l and "filter" in l or "manquantes" in l), None)
verif("fabrique : « drapeau éteint ⇒ UnavailablePaymentGateway » présent", i_drapeau is not None, True)
verif("fabrique : ce retour précède toute lecture de clé", i_drapeau is not None and i_cle is not None and i_drapeau < i_cle, True,
      f"ligne de code {i_drapeau} contre {i_cle}")
sites = [l for l in gg("new ChargilyGateway", "HEAD", "--", "apps", "packages") if ".spec.ts" not in l]
verif("sites `new ChargilyGateway` hors specs", len(sites), 1, " | ".join(s.split(":", 2)[1] + ":" + s.split(":", 3)[2] for s in sites))
fournis = [l for l in gg("provide: PAYMENT_GATEWAY", "HEAD", "--", "apps") if ".spec.ts" not in l]
verif("fournisseurs du jeton PAYMENT_GATEWAY hors specs", len(fournis), 1, " | ".join(f.split(":")[1] for f in fournis))
lecteurs = [l for l in gg("readSession", "HEAD", "--", "apps/api/src") if ".spec.ts" not in l]
verif("mentions de readSession hors specs (déclaration + un appel)", len(lecteurs), 2,
      " | ".join(l.split(":", 3)[3].strip()[:70] for l in lecteurs))
verif("readSession est privée", any("private async readSession" in l for l in lecteurs), True)
refus = show("apps/api/src/payments/unavailable.gateway.ts")
verif("adaptateur de refus : aucun `fetch`", refus.count("fetch("), 0)
verif("adaptateur de refus : lève ServiceUnavailableException", "throw new ServiceUnavailableException" in refus, True)
env = show("apps/api/src/config/env.ts")
bloc = env[env.find("PAYMENTS_ENABLED: z"):env.find("PAYMENTS_ENABLED: z") + 400]
verif("env.ts : PAYMENTS_ENABLED a un défaut à false", ".default(\"false\")" in bloc or ".default(false)" in bloc, True,
      "extrait : " + " ".join(bloc.split())[:160])
print(f"== VERDICT : prémisse {'VÉRIFIÉE' if ok else 'NON VÉRIFIÉE — ne pas écrire la décision'}")
sys.exit(0 if ok else 1)
