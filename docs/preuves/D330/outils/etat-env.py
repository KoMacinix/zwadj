"""D330 — ÉTAT DES FICHIERS `.env` QUE LIT UNE PORTE : empreinte SHA-256 et CLASSE D'HÔTE de chaque variable d'URL. NOUVEAU SCRIPT (pièce versée, procédure archivée comme preuve, pas un instrument promu : D291).

POURQUOI IL EXISTE
  À D329 la marque a été refusée parce que `apps/api/.env` — un fichier IGNORÉ par git, modifié cinq heures avant la passe — pointait `CLIENT_URL` sur un tunnel de développement et que `test:int` le charge (`setup-env.ts` :
  `dotenv/config`). Les six relevés d'arbre (`HEAD` + statut vide) étaient exacts et MUETS sur ce fichier. Décision 2 du relecteur (12/10/2026, déléguée par Ko, ordre des rangs — bloc D330) : « À l'ouverture de la passe et à sa
  clôture, relever, pour chaque fichier `.env` que lit une porte (au moins `apps/api/.env`) : son empreinte sha256 et l'HÔTE de chaque variable d'URL (`CLIENT_URL`, `PRO_URL`, `CORS_ORIGINS`, et toute autre variable d'URL
  relevée). AUCUNE valeur n'est imprimée ni versée. Un hôte qui n'est pas local à l'ouverture : la passe NE DÉMARRE PAS, et le dit. Empreintes différentes entre ouverture et clôture : la marque est refusée. »
  Les valeurs ne sont pas versées parce que le dépôt est public.

LECTURES FAITES PAR LA SESSION (à confirmer — bloc D330 de la méthode renforcée, « ce que la session dérive ») : « variable d'URL » = toute variable dont la valeur contient au moins une URL `schéma://hôte…` (une liste séparée par
  des virgules, comme `CORS_ORIGINS`, compte chaque élément) ; un hôte est LOCAL s'il vaut `localhost`, `127.0.0.1`, `[::1]`, `::1` ou `0.0.0.0` (ou `*.localhost`) ; les identifiants `utilisateur@` sont retirés AVANT de lire l'hôte
  (`http://localhost@distant` est distant) ; l'hôte LOCAL est imprimé, un hôte NON LOCAL ne l'est JAMAIS (« NON LOCAL ») ; l'empreinte porte sur les OCTETS du fichier ; les fichiers relevés sont les `.env` et `.env.*` (hors
  `.example`) de la racine, de chaque dossier de `apps/` et de `packages/`, et de `e2e/`.

INSTRUMENTS ÉCARTÉS : relever la valeur (interdit : dépôt public) ; relever seulement la date de modification (une date ne dit pas si le contenu a changé, ni ce qu'il désigne) ; un `grep` des noms (D275 : un extracteur se calibre).

CALIBRATION, deux bras (D286), REJOUÉE à chaque lancement, abandon si un seul manque : (positif) un fichier synthétique tout local → aucun hôte non local, l'identifiant secret (sentinelle) n'est PAS dans le résultat ; (négatif) un fichier synthétique
  distant → `CLIENT_URL`, l'un des deux éléments de `CORS_ORIGINS`, `localhost@distant`, `localhost.distant`, `?h=localhost` classés NON LOCAL, `[::1]` et `0.0.0.0` restant locaux, et l'hôte distant (sentinelle) n'est PAS dans le résultat ; (empreinte) mêmes
  octets → même empreinte, un octet de plus (LF/CRLF compris) → empreinte différente.

USAGE, depuis la racine (bash, jamais une redirection PowerShell 5.1 : UTF-16, D298) :
  python3 docs/preuves/D330/outils/etat-env.py relever <nom> [<dossier de sortie>]   # écrit <dossier>/etat-env-<nom>.txt ; code 0 = porte VERTE, 3 = un hôte non local, 2 = erreur ou calibration manquée
  python3 docs/preuves/D330/outils/etat-env.py comparer <relevé ouverture> <relevé clôture>   # code 0 = mêmes fichiers, mêmes empreintes ; 4 = une différence (la marque est refusée)
"""
import hashlib
import os
import re
import sys
import time
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)

LOCAUX = {"localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"}


def hote_de(jeton):
    m = re.match(r"^[A-Za-z][A-Za-z0-9+.\-]*://([^/?#]*)", jeton)
    if not m:
        return None
    auth = m[1].rsplit("@", 1)[-1]
    h = auth[: auth.find("]") + 1] if auth.startswith("[") else re.sub(r":\d*$", "", auth)
    return h.lower()


def classe_hote(h):
    return h if (h in LOCAUX or h.endswith(".localhost")) else "NON LOCAL"


def variables_url(octets):
    out = []
    for l in octets.decode("utf-8", errors="replace").splitlines():
        l = l.strip()
        if not l or l.startswith("#"):
            continue
        l = re.sub(r"^export\s+", "", l)
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$", l)
        if not m:
            continue
        val = m[2].strip()
        if len(val) >= 2 and val[0] in "\"'" and val[-1] == val[0]:
            val = val[1:-1]
        else:
            val = re.sub(r"\s+#.*$", "", val)
        hotes = [h for h in (hote_de(j) for j in re.split(r"[,\s;]+", val)) if h]
        if hotes:
            out.append((m[1], [classe_hote(h) for h in hotes]))
    return out


def nb_variables(octets):
    return sum(1 for l in octets.decode("utf-8", errors="replace").splitlines() if re.match(r"^\s*(export\s+)?[A-Za-z_]\w*\s*=", l))


def empreinte(octets):
    return hashlib.sha256(octets).hexdigest()


def fichiers_env():
    racines = ["."] + [f"apps/{d}" for d in sorted(os.listdir("apps"))] + [f"packages/{d}" for d in sorted(os.listdir("packages"))] + ["e2e"]
    out = []
    for r in racines:
        if not os.path.isdir(r):
            continue
        for n in sorted(os.listdir(r)):
            if (n == ".env" or n.startswith(".env.")) and not n.endswith(".example") and os.path.isfile(os.path.join(r, n)):
                out.append(os.path.normpath(os.path.join(r, n)).replace("\\", "/"))
    return out


def calibrer():
    """Deux bras + empreinte ; rend la liste des bras (nom, ok)."""
    secret, tunnel = "SENTINELLE_SECRET_ZW330", "zw330-tunnel.exemple-invalide"
    t_local = (f'CLIENT_URL=http://localhost:3000\nCORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3100"\nexport DATABASE_URL=postgresql://u:{secret}@localhost:5432/db\n'
               f"# COMMENT=https://{tunnel}\nSANS_URL=abc\n")
    t_dist = (f"CLIENT_URL=https://{tunnel}\nCORS_ORIGINS=http://localhost:3000,https://{tunnel}\nA=http://localhost@{tunnel}/x\nB=http://localhost.{tunnel}\n"
              f"C=https://{tunnel}/?h=localhost\nD=http://[::1]:8080\nE=http://0.0.0.0:1\r\n")
    r_l, r_d = variables_url(t_local.encode()), variables_url(t_dist.encode())
    d = dict(r_d)
    return [
        ("positif : un fichier tout local → 3 variables d'URL, toutes locales, ni le secret ni le commentaire dans le résultat",
         [n for n, _ in r_l] == ["CLIENT_URL", "CORS_ORIGINS", "DATABASE_URL"] and all(h != "NON LOCAL" for _, hs in r_l for h in hs) and secret not in repr(r_l) and tunnel not in repr(r_l)),
        ("négatif : CLIENT_URL, un élément de CORS_ORIGINS, `localhost@distant`, `localhost.distant`, `?h=localhost` → NON LOCAL ; [::1] et 0.0.0.0 → locaux ; l'hôte distant n'est PAS dans le résultat",
         d["CLIENT_URL"] == ["NON LOCAL"] and d["CORS_ORIGINS"] == ["localhost", "NON LOCAL"] and d["A"] == ["NON LOCAL"] and d["B"] == ["NON LOCAL"] and d["C"] == ["NON LOCAL"]
         and d["D"] == ["[::1]"] and d["E"] == ["0.0.0.0"] and tunnel not in repr(r_d)),
        ("empreinte : mêmes octets → même empreinte ; un octet de plus (LF → CRLF, ou un chiffre) → empreinte différente",
         empreinte(b"A=1\n") == empreinte(b"A=1\n") and empreinte(b"A=1\n") != empreinte(b"A=1\r\n") and empreinte(b"A=1\n") != empreinte(b"A=2\n")),
        ("comptage : 4 variables dans le fichier local synthétique (le commentaire n'en est pas une)", nb_variables(t_local.encode()) == 4),
    ]


def lancer_calibration():
    bras = calibrer()
    for nom, ok in bras:
        print(f"   {'✓' if ok else '✗'} calibration {nom}")
    if not all(ok for _, ok in bras):
        print("✗ ABANDON : calibration manquée")
        sys.exit(2)
    return bras


def relever(nom, dossier):
    print(f"ÉTAT DES FICHIERS .env — relevé « {nom} » — HORODATAGE {time.strftime('%d/%m/%Y %H:%M:%S')} — AUCUNE VALEUR (empreinte et classe d'hôte seulement)")
    bras = lancer_calibration()
    fichiers = fichiers_env()
    lignes = []
    non_locaux = []
    n_url = 0
    if "apps/api/.env" not in fichiers:
        print("✗ apps/api/.env est ABSENT : le seul fichier que `test:int` lit par un `dotenv` explicite manque.")
        sys.exit(2)
    for f in fichiers:
        b = open(f, "rb").read()
        mtime = datetime.fromtimestamp(os.path.getmtime(f)).strftime("%Y-%m-%d %H:%M:%S")
        vu = variables_url(b)
        n_url += len(vu)
        lignes.append(f"FICHIER {f} · octets {len(b)} · SHA256 {empreinte(b)} · modifié {mtime} · {nb_variables(b)} variable(s) dont {len(vu)} d'URL")
        for n, hs in vu:
            lignes.append(f"   URL {n} : " + ", ".join(hs))
            if "NON LOCAL" in hs:
                non_locaux.append(f"{f}:{n}")
    sortie = lignes + [f"RÉSUMÉ fichiers {len(fichiers)} · variables d'URL {n_url} · hôtes non locaux {len(non_locaux)} (attendu 0) : {non_locaux}", "PORTE : " + ("VERTE" if not non_locaux else "ROUGE — un hôte n'est pas local")]
    for l in sortie:
        print(l)
    if dossier:
        os.makedirs(dossier, exist_ok=True)
        with open(os.path.join(dossier, f"etat-env-{nom}.txt"), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(f"ÉTAT DES FICHIERS .env — relevé « {nom} » — HORODATAGE {time.strftime('%d/%m/%Y %H:%M:%S')} — AUCUNE VALEUR\n")
            fh.write(f"calibration : {len(bras)} bras, tous ✓\n")
            fh.write("\n".join(sortie) + "\n")
    sys.exit(0 if not non_locaux else 3)


def lire_relevé(chemin):
    t = open(chemin, encoding="utf-8").read()
    return {m[1]: m[2] for m in re.finditer(r"^FICHIER (\S+) · octets \d+ · SHA256 ([0-9a-f]{64}) ", t, re.M)}, t


def comparer(a, b):
    lancer_calibration_comparaison()
    fa, ta = lire_relevé(a)
    fb, tb = lire_relevé(b)
    print(f"ouverture : {len(fa)} fichier(s) · clôture : {len(fb)} fichier(s)")
    diffs = []
    for f in sorted(set(fa) | set(fb)):
        if f not in fa:
            diffs.append(f"{f} : APPARU à la clôture")
        elif f not in fb:
            diffs.append(f"{f} : DISPARU à la clôture")
        elif fa[f] != fb[f]:
            diffs.append(f"{f} : EMPREINTE DIFFÉRENTE")
    non_locaux = re.findall(r"^   URL (\S+) : .*NON LOCAL", tb, re.M)
    if non_locaux:
        diffs.append(f"hôte(s) non local(aux) à la clôture : {non_locaux}")
    for d in diffs:
        print("⛔ " + d)
    print("COMPARAISON : " + ("IDENTIQUE — mêmes fichiers, mêmes empreintes, hôtes locaux (attendu)" if not diffs else "DIFFÉRENCE — la marque est refusée"))
    sys.exit(0 if not diffs else 4)


def lancer_calibration_comparaison():
    """Deux bras de la comparaison : deux relevés synthétiques identiques → identique ; l'un avec une empreinte changée → différence."""
    import tempfile
    d = tempfile.mkdtemp(prefix="zwadj-d330-env-")
    h1, h2 = "a" * 64, "b" * 64
    mk = lambda nom, h: open(os.path.join(d, nom), "w", encoding="utf-8").write(f"FICHIER apps/api/.env · octets 10 · SHA256 {h} · modifié x · 1 variable(s) dont 0 d'URL\n")
    mk("o.txt", h1); mk("c-ok.txt", h1); mk("c-ko.txt", h2)
    a, _ = lire_relevé(os.path.join(d, "o.txt"))
    b_ok, _ = lire_relevé(os.path.join(d, "c-ok.txt"))
    b_ko, _ = lire_relevé(os.path.join(d, "c-ko.txt"))
    ok = a == b_ok and a != b_ko
    print(f"   {'✓' if ok else '✗'} calibration comparaison : deux relevés identiques → identiques ; une empreinte changée → différents")
    if not ok:
        print("✗ ABANDON : calibration manquée")
        sys.exit(2)


if len(sys.argv) >= 3 and sys.argv[1] == "relever":
    relever(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
elif len(sys.argv) == 4 and sys.argv[1] == "comparer":
    comparer(sys.argv[2], sys.argv[3])
else:
    print(__doc__)
    sys.exit(2)
