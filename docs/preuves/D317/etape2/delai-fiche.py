"""D317, rang 26, étape 2, MD2-g — COMBIEN DE TEMPS ENTRE LA RECHERCHE ET LES DONNÉES DE LA FICHE ? Pièce versée (procédure
archivée comme preuve, D291). N'écrit rien : elle imprime.

POURQUOI. Au premier passage de `r26-parcours-reservation.e2e.ts`, le test d'acceptation — le premier à ouvrir une fiche —
a échoué à `toHaveURL` (7 s) après le clic depuis la recherche ; le test suivant est passé. Le serveur client ne raccorde pas
sa sortie (rien sur ses compilations) ; le journal de l'API, si : il date chaque requête. La fiche salle, rendue côté
serveur, demande `GET /api/v1/venues/<slug>` dès qu'elle est compilée et rendue. L'écart entre la dernière
`GET /api/v1/venues` (la liste de la recherche) et ce `GET` mesure donc ce qu'a coûté l'ouverture de la fiche.
Ce qu'elle lit : les lignes « request completed » de l'API (heure, méthode, chemin — RIEN d'autre n'est imprimé ; les
journaux bruts portent des jetons et des cookies et restent hors dépôt, D315). Chaque journal lu est nommé avec son
empreinte, pour se rattacher aux extraits versés.
⚠ DÉFAUT D'INSTRUMENT RÉPARÉ (D298) : l'appariement « dernière recherche → fiche » ne vaut que pour une passe d'UNE spec sur
UN worker. Dans la suite complète (deux workers, des fiches ouvertes par `goto` sans recherche), la première version appariait
des requêtes de tests DIFFÉRENTS — mesuré sur la porte e2e : 0,6 et 10,9 s pour la MÊME recherche, sur une suite entièrement
verte. Une recherche qui précède deux fiches rend désormais « APPARIEMENT INVALIDE », jamais un chiffre.
Usage, depuis la racine :  python docs/preuves/D317/etape2/delai-fiche.py <journal>…
"""
import datetime
import hashlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
for chemin in sys.argv[1:]:
    brut = open(chemin, "rb").read()
    t = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", brut.decode("utf-8", "replace"))
    ev = []
    for l in t.splitlines():
        m = re.search(r"\[(\d\d:\d\d:\d\d\.\d+)\] INFO .*?\"method\":\"(\w+)\",\"url\":\"([^\"?]+)", l)
        if m:
            ev.append((datetime.datetime.strptime(m.group(1), "%H:%M:%S.%f"), m.group(2), m.group(3)))
    fiches = [i for i, (_, meth, url) in enumerate(ev) if meth == "GET" and re.fullmatch(r"/api/v1/venues/salle-e2e-[0-9a-f]+", url)]
    print(f"{chemin.replace(chr(92), '/')} · sha256 {hashlib.sha256(brut).hexdigest()[:16]}… · requêtes lues {len(ev)} · "
          f"ouvertures de fiche {len(fiches)}")
    paires = []
    for i in fiches:
        paires.append((max((k for k in range(i) if ev[k][1] == "GET" and ev[k][2] == "/api/v1/venues"), default=None), i))
    recherches = [j for j, _ in paires if j is not None]
    for n, (j, i) in enumerate(paires, 1):
        if j is None:
            print(f"   fiche n°{n} : aucune recherche avant elle — non mesuré")
        elif recherches.count(j) > 1:
            print(f"   fiche n°{n} : APPARIEMENT INVALIDE — la recherche de {ev[j][0].time()} précède {recherches.count(j)} "
                  "fiches (tests entrelacés, ou fiche ouverte sans recherche) — non mesuré")
        else:
            print(f"   fiche n°{n} : recherche {ev[j][0].time()} → données de la fiche {ev[i][0].time()} : "
                  f"{(ev[i][0] - ev[j][0]).total_seconds():.1f} s")
