"""D315 — rang 24 — MESURE d'un défaut vu sur une capture, AVANT de l'écrire : sur la fiche salle, client connecté
(capture 26), le panneau « Demander cette salle » affiche « Cette salle ne propose aucune date pour le moment » alors que
le calendrier de la même page montre des jours à 180 000 DA et que l'API a accepté une demande sur cette salle.
Hypothèse lue dans le code, à confirmer ou infirmer ici : le panneau (`booking-request-panel.tsx`) demande une fenêtre de
`WINDOW_DAYS` jours ; le contrat refuse au-delà de `AVAILABILITY_MAX_WINDOW_DAYS`, bornes INCLUSES (D147) ; le 400 devient
`null` dans `getVenueAvailability`, et `null` s'affiche « aucune date ».
Les deux constantes sont LUES dans leurs sources (jamais recopiées) ; les bornes sont calculées comme `civilDate` du
panneau (instant + 1 h, lu en UTC). Deux bras : (P) la fenêtre du panneau ; (T) témoin — même début, largeur exactement
`AVAILABILITY_MAX_WINDOW_DAYS` jours bornes incluses. Ne corrige rien. N'imprime aucun jeton (route anonyme).
Prérequis : l'API tourne sur la base e2e (`zwadj_e2e`), port 3101, avec la salle de capture publiée.
Usage, depuis la racine :  python docs/preuves/D315/mesures/mesurer-fenetre-panneau.py <slug>
"""
import datetime
import json
import re
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
slug = sys.argv[1]
panneau = open("apps/client/src/components/venue/booking-request-panel.tsx", encoding="utf-8").read()
types = open("packages/types/src/venue.ts", encoding="utf-8").read()
W = int(re.search(r"^const WINDOW_DAYS = (\d+);", panneau, re.M).group(1))
MAX = int(re.search(r"^export const AVAILABILITY_MAX_WINDOW_DAYS = (\d+);", types, re.M).group(1))
print(f"lu dans le source : WINDOW_DAYS = {W} (panneau) · AVAILABILITY_MAX_WINDOW_DAYS = {MAX} (contrat)")


def civil(ms: int) -> str:
    return datetime.datetime.fromtimestamp((ms + 3_600_000) / 1000, tz=datetime.timezone.utc).strftime("%Y-%m-%d")


now = int(time.time() * 1000)
bras = {"P, fenêtre du panneau": (civil(now + 86_400_000), civil(now + W * 86_400_000)),
        "T, témoin": (civil(now + 86_400_000), civil(now + MAX * 86_400_000))}
for nom, (de, a) in bras.items():
    jours = (datetime.date.fromisoformat(a) - datetime.date.fromisoformat(de)).days + 1
    url = f"http://localhost:3101/api/v1/venues/{slug}/availability?from={de}&to={a}"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            s, b = r.status, r.read()
    except urllib.error.HTTPError as e:
        s, b = e.code, e.read()
    try:
        j = json.loads(b)
    except json.JSONDecodeError:
        j = None
    detail = (f"{len(j.get('days', []))} jour(s) rendus" if isinstance(j, dict) and "days" in j
              else f"corps {b[:160]!r}")
    print(f"({nom}) from={de} to={a} · {jours} jours bornes incluses · statut {s} · {detail}")
