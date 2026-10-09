#!/usr/bin/env python3
"""
D327 — RANG 34, RELEVÉ n° 3 : CE QUE DONNENT LES RÈGLES **PROPOSÉES** (NON ARBITRÉES) POUR LA RÉFÉRENCE D'UN DEVIS, SUR LES DONNÉES DE DÉVELOPPEMENT ET LE SEMIS (pièce versée ; lot DOCUMENTAIRE).

⛔ CE SCRIPT N'IMPLÉMENTE PAS UNE DÉCISION : les règles sont celles que le RELECTEUR a PROPOSÉES (consigne du rang 34, point 3) et que Ko n'a PAS arbitrées ; elles se valideront au cadrage. Il les applique
LITTÉRALEMENT, pour que les cas limites se MONTRENT (collisions, noms vides, noms non latins) — il n'en choisit aucune variante. Ce que la consigne ne dit pas est rendu « non défini », jamais deviné.

LES RÈGLES, mot pour mot de la consigne :
  - Référence : `ko_01_ab_v1` (sans la langue) ; fichier : `ko_01_ab_fr_v1.pdf` ; « minuscules sans accent, chiffres et `_` seulement ».
  - Salle : « nom latin, minuscules, accents retirés. On retire « salle des fêtes » / « salle de fêtes », « salle », « et », et les articles « le, la, les, l', de, des, du, d' ». Il reste un mot : ses
    deux premières lettres. Deux ou plus : la première lettre des deux premiers. Rien : les deux premières lettres du nom d'origine. »
  - Numéro : « par salle et par devis (une révision garde son numéro, seul `v` change) ; à partir de `01` ; jamais réutilisé, trous permis ».
  - Client : « même règle que la salle, sans mots retirés. Absent : `xx`. Nom en arabe : table fixe « première lettre arabe → lettre latine » (à écrire au cadrage, relue par Ko). »
  - « Initiales et numéro figés à la création, jamais recalculés. »
Deux détails que la consigne LAISSE OUVERTS et que ce script rend tels quels : (1) le « nom » du client est ici `prénom + espace + nom` (les deux champs que les écrans saisissent) — la variante « initiale du
prénom + initiale du nom » est imprimée À CÔTÉ quand elle diffère ; (2) un jeton d'une lettre issu d'une apostrophe (« l' », « d' ») est l'article retiré ; un « d » ou un « l » SEUL dans un nom est donc retiré
aussi — cas limite signalé, pas tranché.

USAGE, depuis la RACINE : python3 docs/preuves/D327/releve/reference/regles-proposees.py > docs/preuves/D327/releve/reference/regles-proposees-sortie.txt   (bash, jamais PowerShell : UTF-16, D298)
SOURCES, LECTURE SEULE : la base de DÉVELOPPEMENT `zwadj` (conteneur `zwadj-db`, requêtes SELECT) ; `apps/api/prisma/seed-demo.ts` (le semis) ; `docs/preuves/D327/releve/pdf/sortie/ids.json` (les trois devis de la sonde).
⚠ UN NOM DE PERSONNE NE SE VERSE PAS SANS NÉCESSITÉ : les noms de CONTACT de la base de développement (le nom saisi dans le parcours sur place) sont MASQUÉS dans la sortie — premier caractère de chaque mot,
le reste en étoiles. Ce que la consigne demande est ce que donnent les règles, pas les noms : les initiales sont calculées sur la valeur RÉELLE, lue à l'exécution, et seul l'affichage est masqué. (Les noms
de SALLE sont des noms d'établissement d'essai : ils s'impriment.) Le nom saisi ne figure donc nulle part dans le dépôt versé ; le script, lui, le relit à chaque exécution sur la même base.

CALIBRATION, deux bras, ABANDON si un seul manque (D286) : POSITIF — les trois exemples de Ko (salle « Koceila » → `ko`, salle « Dune et Plage » → `dp`, cliente « Amel Bentaleb » → `ab`) ; NÉGATIF — la dérivation
NAÏVE (les deux premières lettres du nom entier) donne `du` pour « Dune et Plage » : la règle doit s'en DISTINGUER ; et une chaîne sans lettre latine donne « non défini », pas un résultat inventé.
Chaque compte s'imprime avec ce qu'il a PARCOURU (D290).
"""
import json
import os
import re
import subprocess
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

ARTICLES = {"le", "la", "les", "l", "de", "des", "du", "d"}
MOTS_RETIRES_SALLE = {"salle", "et"}


def sans_accent(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def normaliser(s):
    return sans_accent(s).lower().replace("’", "'")


def jetons(s):
    """Les suites de [a-z0-9] — l'apostrophe et le tiret séparent (« d'essai » → « d », « essai »)."""
    return re.findall(r"[a-z0-9]+", s)


def initiales(jets, nom_origine_normalise):
    """Un jeton : ses deux premières lettres ; deux ou plus : la première lettre des deux premiers ; aucun : les deux premières lettres du nom d'origine ; None si rien n'est utilisable."""
    if len(jets) == 1:
        return jets[0][:2] if len(jets[0]) >= 2 else None
    if len(jets) >= 2:
        return jets[0][0] + jets[1][0]
    reste = "".join(jetons(nom_origine_normalise))
    return reste[:2] if len(reste) >= 2 else None


def initiales_salle(nom_fr):
    n = normaliser(nom_fr)
    n = re.sub(r"\bsalle\s+(?:des|de)\s+fetes\b", " ", n)
    jets = [j for j in jetons(n) if j not in MOTS_RETIRES_SALLE and j not in ARTICLES]
    return initiales(jets, normaliser(nom_fr))


def initiales_client(nom):
    """« sans mots retirés » ; absent (None, vide) → `xx`. Un nom sans aucune lettre latine → None (« non défini » : la table arabe est à écrire au cadrage)."""
    if nom is None or nom.strip() == "":
        return "xx"
    n = normaliser(nom)
    return initiales(jetons(n), n)


def initiales_client_prenom_nom(prenom, nom):
    a, b = jetons(normaliser(prenom or "")), jetons(normaliser(nom or ""))
    return (a[0][0] + b[0][0]) if a and b else None


# ══ CALIBRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== CALIBRATION — deux bras, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


bras("positif · salle « Koceila » → ko (Ko)", initiales_salle("Koceila"), "ko")
bras("positif · salle « Dune et Plage » → dp (Ko)", initiales_salle("Dune et Plage"), "dp")
bras("positif · cliente « Amel Bentaleb » → ab (Ko)", initiales_client("Amel Bentaleb"), "ab")
bras("négatif · la dérivation naïve (deux premières lettres du nom entier) donne « du » — la règle doit s'en distinguer", (initiales_salle("Dune et Plage"), normaliser("Dune et Plage")[:2]), ("dp", "du"))
bras("négatif · un nom sans lettre latine n'a pas d'initiales inventées", initiales_client("آمنة بن سالم"), None)
if not all(cal):
    sys.exit(f"CALIBRATION : {cal.count(False)} bras manqué(s) — l'instrument ne juge pas")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")


# ══ LES DONNÉES, LUES (jamais écrites de mémoire) ══════════════════════════════════════════════════════════════════════
def psql(requete):
    p = subprocess.run(["docker", "exec", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-At", "-F", "|", "-c", requete], capture_output=True, check=True)
    return [l.split("|") for l in p.stdout.decode("utf-8").split("\n") if l.strip() != ""]


salles = psql("SELECT id, name_fr, owner_id, (deleted_at IS NOT NULL)::text, created_at::text FROM venues ORDER BY created_at")
semis = open("apps/api/prisma/seed-demo.ts", encoding="utf-8").read()
salles_semis = re.findall(r'^\s*nameFr: "([^"]+)",', semis, flags=re.M)
contacts = psql("SELECT contact_first_name, contact_last_name, count(*) FROM bookings GROUP BY 1, 2 ORDER BY 3 DESC")
comptes = psql("SELECT role::text, coalesce(first_name,''), coalesce(last_name,'') FROM users")
quotes = psql(
    "SELECT q.id, q.venue_id, q.chain_id, q.version, q.created_at::text, q.client_id IS NOT NULL, coalesce(b.contact_first_name,''), coalesce(b.contact_last_name,'') "
    "FROM quotes q LEFT JOIN bookings b ON b.quote_id = q.id ORDER BY q.created_at, q.version"
)
print(f"== données parcourues : salles de dev {len(salles)} · salles du semis {len(salles_semis)} · noms de contact distincts {len(contacts)} · comptes {len(comptes)} · devis {len(quotes)}\n")

# ══ SALLES ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
print("== SALLES DE LA BASE DE DÉVELOPPEMENT (les supprimées sont comptées : elles gardent leur numéro, une suppression est douce)")
par_pro = {}
for id_, nom, proprio, supprimee, cree in salles:
    ini = initiales_salle(nom)
    par_pro.setdefault(proprio, []).append((id_, nom, ini, supprimee == "true"))
    print(f"   {id_[:8]} · « {nom} » · normalisé « {normaliser(nom)} » · initiales `{ini}` · supprimée {supprimee} · créée {cree[:19]}")
print()
for proprio, liste in par_pro.items():
    comptes_ini = {}
    for _, _, ini, _ in liste:
        comptes_ini[ini] = comptes_ini.get(ini, 0) + 1
    collisions = {k: v for k, v in comptes_ini.items() if v > 1}
    vivantes = {}
    for _, _, ini, supp in liste:
        if not supp:
            vivantes[ini] = vivantes.get(ini, 0) + 1
    print(f"   pro {proprio[:8]} : {len(liste)} salles · initiales par salle {dict(comptes_ini)} · COLLISIONS (même initiales, même pro) {collisions} · parmi les salles non supprimées : {dict(vivantes)}")
print()

# Le PREMIER devis de chaque salle, sous les règles proposées (compteur par salle, à partir de 01) : deux salles du même pro aux mêmes initiales donnent-elles la même référence ?
for proprio, liste in par_pro.items():
    premieres = [(id_[:8], f"{ini}_01_xx_v1") for id_, nom, ini, supp in liste]
    distinctes = {r for _, r in premieres}
    print(f"   pro {proprio[:8]} : référence du PREMIER devis de chacune des {len(liste)} salles (client absent) : {[r for _, r in premieres]} → {len(distinctes)} référence(s) distincte(s) pour {len(liste)} salles")
print()

print("== SALLES DU SEMIS (`apps/api/prisma/seed-demo.ts`, un seul pro de démonstration)")
ini_semis = {}
for nom in salles_semis:
    ini = initiales_salle(nom)
    ini_semis.setdefault(ini, []).append(nom)
    print(f"   « {nom} » · jetons conservés {[j for j in jetons(re.sub(r'\bsalle\s+(?:des|de)\s+fetes\b', ' ', normaliser(nom))) if j not in MOTS_RETIRES_SALLE and j not in ARTICLES]} · initiales `{ini}`")
print(f"   collisions parmi les {len(salles_semis)} salles du semis : {({k: v for k, v in ini_semis.items() if len(v) > 1})}")
tous = {}
for _, nom, _, _, _ in [(s[0], s[1], s[2], s[3], s[4]) for s in salles]:
    tous.setdefault(initiales_salle(nom), set()).add(nom)
for nom in salles_semis:
    tous.setdefault(initiales_salle(nom), set()).add(nom)
print(f"   toutes salles confondues (dev + semis, tous propriétaires) : {sum(len(v) for v in tous.values())} noms distincts, {len(tous)} initiales distinctes, collisions entre propriétaires possibles : {({k: sorted(v) for k, v in tous.items() if len(v) > 1})}")
print()

# ══ CLIENTS ════════════════════════════════════════════════════════════════════════════════════════════════════════════
print("== NOMS DE CLIENT DE LA BASE DE DÉVELOPPEMENT (contacts des réservations ; les comptes `users` n'ont aucun nom)")
for prenom, nom, n in contacts:
    complet = f"{prenom} {nom}".strip()
    vu = " ".join(m[0] + "*" * (len(m) - 1) for m in complet.split())
    a, b = initiales_client(complet), initiales_client_prenom_nom(prenom, nom)
    print(f"   « {vu} » (nom MASQUÉ ; {len(complet.split())} mot(s)) (×{n} réservations) · règle proposée sur le nom entier `{a}` · variante prénom/nom `{b}`{'  ← DIFFÈRE' if a != b else ''}")
print(f"   comptes users : {[(r, bool(p), bool(n)) for r, p, n in comptes]} (rôle, prénom présent, nom présent)")
print(f"   noms de contact à lettres NON latines : {sum(1 for p, n, _ in contacts if initiales_client(p + ' ' + n) is None)} sur {len(contacts)}")
print()

# ══ LE NUMÉRO ══════════════════════════════════════════════════════════════════════════════════════════════════════════
print("== LE NUMÉRO — par salle et par DEVIS (une chaîne de révisions = un devis) : ce que donnerait la numérotation des devis EXISTANTS par ordre de création")
chaines = {}
for qid, venue, chaine, version, cree, a_client, pre, nom in quotes:
    c = chaines.setdefault((venue, chaine), {"cree": cree, "versions": 0, "contact": None})
    c["versions"] += 1
    if pre or nom:
        c["contact"] = f"{pre} {nom}".strip()
par_salle = {}
for (venue, chaine), c in sorted(chaines.items(), key=lambda kv: kv[1]["cree"]):
    par_salle.setdefault(venue, []).append((chaine, c))
nom_de = {s[0]: s[1] for s in salles}
for venue, liste in par_salle.items():
    print(f"   salle {venue[:8]} (« {nom_de.get(venue, '?')} », initiales `{initiales_salle(nom_de.get(venue, ''))}`) : {len(liste)} devis")
    for i, (chaine, c) in enumerate(liste, 1):
        ini = initiales_salle(nom_de[venue])
        cli = initiales_client(c["contact"]) if c["contact"] else "xx"
        print(f"      chaîne {chaine[:8]} · {c['versions']} version(s) · créée {c['cree'][:19]} → `{ini}_{i:02d}_{cli}_v1` (nom de client lu sur la réservation liée : {'oui' if c['contact'] else 'non — aucune'})")
print(f"   devis parcourus : {len(quotes)} · chaînes : {len(chaines)} · devis liés à un compte (`client_id`) : {sum(1 for q in quotes if q[5] == 't')}")
sans_nom_a_la_creation = len(chaines)
print(f"   ⇒ à la CRÉATION le serveur ne reçoit aucun nom (le contrat de création n'en porte pas) : « absent : xx » s'appliquerait à {sans_nom_a_la_creation} chaînes sur {len(chaines)}")
print()

# ══ LA RÉFÉRENCE ACTUELLE — `id.slice(0, 8)` d'un UUIDv7 ═══════════════════════════════════════════════════════════════
print("== LA RÉFÉRENCE ACTUELLE : les huit premiers caractères d'un UUIDv7 — ce qu'ils discriminent")
prefixes = {}
for q in quotes:
    prefixes.setdefault(q[0][:8], []).append(q[0])
print(f"   base de développement : {len(quotes)} devis, {len(prefixes)} préfixes distincts de 8 caractères ; préfixes partagés : {({k: len(v) for k, v in prefixes.items() if len(v) > 1})}")
ids = json.load(open("docs/preuves/D327/releve/pdf/sortie/ids.json", encoding="utf-8"))
trois = [ids["A"], ids["B"], ids["C"]]
print(f"   sonde du relevé n° 1 : les trois devis A, B, C créés à quelques secondes d'écart → préfixes {[i[:8] for i in trois]} (distincts : {len(set(i[:8] for i in trois))})")
# Un UUIDv7 porte un horodatage en millisecondes sur 48 bits : les 8 premiers caractères hexadécimaux sont les 32 bits de poids fort, soit un pas de 2^16 ms.
pas_ms = 2 ** 16
print(f"   mécanisme (RFC 9562) : 48 bits d'horodatage en ms ; les 8 premiers caractères hexadécimaux en sont les 32 bits de poids fort ⇒ le préfixe ne change que tous les {pas_ms} ms = {pas_ms / 1000:.3f} s")
print(f"   ⇒ deux devis créés dans la même fenêtre de {pas_ms / 1000:.3f} s portent la même référence imprimée ; pour un jour de {24 * 3600} s : au plus {int(24 * 3600 / (pas_ms / 1000)) + 1} références distinctes")
print()
print("== FIN — PARCOURU : salles dev %d, salles semis %d, contacts %d, devis %d (attendu : 5, 6, ≥1, 15 à la date du relevé)" % (len(salles), len(salles_semis), len(contacts), len(quotes)))
