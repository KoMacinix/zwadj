"""D315 — rang 24 — MESURE d'un défaut vu sur une capture, AVANT de l'écrire : la section « Supprimer mon compte »
affiche « Impossible de vérifier l'état de votre demande » dans les DEUX applications (captures 27 et 46).
Hypothèse lue dans le code, à confirmer ou infirmer ici : pour un compte SANS demande, `GET /api/v1/me/deletion-request`
rend un 200 à corps VIDE (le contrôleur retourne `null`) ; `authedRequest` (`packages/api-client/src/auth-client.ts`)
ne tolère un corps vide que sur un 204 et appelle `res.json()` — qui lève sur une chaîne vide.
Deux bras : (A) compte sans demande ; (B) le même compte après `POST /me/deletion-request` — le corps doit alors porter
un objet avec `status`. Puis (C) : le décodage que fait `authedRequest`, rejoué sur les deux corps mesurés
(`json.loads`, l'équivalent de `res.json()`), pour dire lequel lève.
Ne corrige rien. N'imprime AUCUN jeton ni mot de passe (le mot de passe de fixture est lu dans `e2e/fixtures/harness.ts`).
Prérequis : l'API tourne sur la base e2e (`zwadj_e2e`), avec les surcharges d'environnement de `e2e/playwright.config.ts`.
Usage, depuis la racine :  python docs/preuves/D315/mesures/mesurer-deletion-request.py <e-mail d'un compte CLIENT de fixture>
"""
import json
import re
import sys
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
API = "http://localhost:3101/api/v1"
email = sys.argv[1]
mdp = re.search(r'const PASSWORD = "([^"]+)"', open("e2e/fixtures/harness.ts", encoding="utf-8").read()).group(1)


def appel(methode, chemin, jeton=None, corps=None):
    req = urllib.request.Request(API + chemin, method=methode, data=None if corps is None else json.dumps(corps).encode())
    req.add_header("content-type", "application/json")
    if jeton:
        req.add_header("authorization", f"Bearer {jeton}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


s, _, b = appel("POST", "/auth/login", corps={"email": email, "password": mdp})
print(f"login : statut {s} (attendu 200)")
jeton = json.loads(b)["accessToken"]


def montrer(bras):
    s, h, b = appel("GET", "/me/deletion-request", jeton)
    ct = h.get("Content-Type") or h.get("content-type")
    cl = h.get("Content-Length") or h.get("content-length")
    print(f"({bras}) GET /me/deletion-request : statut {s} · Content-Type {ct!r} · Content-Length {cl!r} · "
          f"{len(b)} octet(s) de corps · corps {b[:120]!r}")
    return b


a = montrer("A, sans demande")
s, _, _ = appel("POST", "/me/deletion-request", jeton, {})
print(f"(B) POST /me/deletion-request : statut {s} (attendu 201)")
bb = montrer("B, avec demande")
for nom, corps in (("A", a), ("B", bb)):
    try:
        v = json.loads(corps.decode("utf-8"))
        print(f"(C) décodage JSON du corps {nom} : ne lève pas · valeur de type {type(v).__name__}"
              f"{' · clé status présente' if isinstance(v, dict) and 'status' in v else ''}")
    except json.JSONDecodeError as e:
        print(f"(C) décodage JSON du corps {nom} : LÈVE — {e.msg} (l'équivalent de `res.json()` rejette)")
