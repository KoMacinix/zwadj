"""D321 — les 62 entrées « RÉALISÉ » de D315 (ouvertes à tort au backlog), re-confrontées au code à HEAD.

POURQUOI IL EXISTE
  Consigne de Ko (rang 29, partie A, point 3) : « Re-confronte chacune à HEAD, puisque le code a bougé depuis ffd32e9.
  Coche celles qui tiennent, avec renvoi. Une entrée qui ne tient plus, tu la dis et tu ne la coches pas. »
  Le verdict de D315 est une pièce datée (`ENTREES-CONFRONTEES.md`, à `ffd32e9`) ; il ne vaut pas pour `HEAD` sans mesure.

CE QU'IL FAIT, pour chaque entrée « RÉALISÉ » de la pièce de D315 :
  1. retrouve son texte à `ffd32e9` (« B:NNN » = numéro de ligne à ce SHA) et exige une case ouverte `- [ ]` ;
  2. la retrouve au backlog de `HEAD` par ce texte (les numéros dérivent) — ligne courante, case toujours ouverte ;
  3. joue SES sondes au SHA `b5bd382` (= HEAD pour le code : seul `.md` et `docs/preuves` bougent dans ce lot avant la
     partie B) : une route dans la carte relevée des décorateurs, ou un motif dans un fichier — chaque sonde imprime ce
     qu'elle a trouvé (D275 : un compte se confronte à son contexte) ;
  4. dit si un fichier sondé a changé depuis `ffd32e9` (relu, donc) ;
  5. rend TIENT / NE TIENT PLUS, avec le motif — le jugement des cas partiels est écrit dans `JUGES`, à la main, et
     imprimé : ce n'est pas une sonde qui décide qu'un « ± » manque.

USAGE, depuis la racine (bash) :
  python3 docs/preuves/D321/entrees/confronter-62.py > docs/preuves/D321/entrees/confronter-62-sortie.txt

LECTURE SEULE, objets git aux SHA fixés.

CALIBRATION, deux bras (D286) : la carte des routes doit trouver une route connue et pas une route inventée ; une sonde
  de motif doit trouver un motif connu et pas un motif absent ; le relevé des entrées doit compter 62 à partir de la pièce
  et 0 « RÉALISÉ » sur une table synthétique sans ce verdict. Abandon si un bras manque.
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

CODE = "b5bd382"   # le code de HEAD (inchangé par ce lot avant la partie B — contrôle T0 de la lecture adverse)
D315 = "ffd32e9"   # le SHA de la pièce de D315
PIECE = "docs/preuves/D315/etat-produit/ENTREES-CONFRONTEES.md"


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, check=True).stdout.decode("utf-8").replace("\r\n", "\n")


def show(sha, p):
    return git("show", f"{sha}:{p}")


def show_ou_rien(sha, p):
    """Défaut de la passe 1 : un fichier absent levait une trace et arrêtait tout. Il rend désormais None — la sonde
    échoue LISIBLEMENT (« fichier absent »), et les entrées suivantes sont jouées."""
    try:
        return show(sha, p)
    except subprocess.CalledProcessError:
        return None


def carte_routes(sha):
    noms = [n for n in git("ls-tree", "-r", "--name-only", sha, "apps/api/src").split() if n.endswith(".controller.ts")]
    routes = set()
    for n in noms:
        pref = None
        for l in show(sha, n).split("\n"):
            m = re.search(r'@Controller\((?:"([^"]*)")?\)', l)
            if m:
                pref = m.group(1) or ""
                continue
            m = re.search(r'@(Get|Post|Patch|Delete|Put)\((?:"([^"]*)")?\)', l)
            if m and pref is not None:
                routes.add(f"{m.group(1).upper()} /" + "/".join(x for x in (pref, m.group(2) or "") if x))
    return routes, len(noms)


def code_seul(lignes):
    """(n°, ligne) des lignes qui ne sont PAS des commentaires. Défaut de la passe 4 : neuf sondes s'arrêtaient sur un
    commentaire qui CITE l'identifiant cherché — une garde de source satisfaite par sa propre documentation (S11-a)."""
    return [(i + 1, l) for i, l in enumerate(lignes) if not l.strip().startswith(("//", "*", "/*", "{/*"))]


def releve(texte):
    return re.findall(r"^\| B:(\d+) \| (.+?) \| RÉALISÉ \| (.+?) \|$", texte, flags=re.M)


ROUTES, NB_CTRL = carte_routes(CODE)

# ── CALIBRATION ─────────────────────────────────────────────────────────────────────────────────────────────────────
print("== CALIBRATION — deux bras, abandon si un seul manque")
bras = [
    ("carte des routes, positif", "POST /admin/venues/:id/publish" in ROUTES, True),
    ("carte des routes, négatif (route inventée)", "POST /admin/venues/:id/reject" in ROUTES, False),
    ("sonde de motif, positif", bool(re.search(r"hm-map", show(CODE, "apps/client/src/components/home-view.tsx"))), True),
    ("sonde de motif, négatif", bool(re.search(r"zzz-absent-d321", show(CODE, "apps/client/src/components/home-view.tsx"))), False),
    ("fichier absent, négatif (ajouté passe 2)", show_ou_rien(CODE, "apps/api/src/venues/zzz-absent.ts"), None),
    ("fichier absent, positif (ajouté passe 2)", show_ou_rien(CODE, "apps/api/src/main.ts") is not None, True),
    ("commentaire ignoré, négatif (ajouté passe 5)", len(code_seul(["// conflictIds", " *  conflictIds", "{/* conflictIds */}"])), 0),
    ("commentaire ignoré, positif (ajouté passe 5)", len(code_seul(["  const conflictIds = x; // conflictIds"])), 1),
    ("relevé des entrées, positif (la pièce)", len(releve(show(CODE, PIECE))), 62),
    ("relevé des entrées, négatif (verdict voisin)", len(releve("| B:1 | x | RÉALISÉ AUTREMENT | y |\n| B:2 | x | PARTIEL | y |")), 0),
]
manques = 0
for nom, mesure, attendu in bras:
    manques += mesure != attendu
    print(f"  calibration {'✓' if mesure == attendu else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")
print(f"  calibration : {len(bras)} bras · {manques} manqué(s) (attendu 0)")
print(f"  carte : {len(ROUTES)} routes sur {NB_CTRL} contrôleurs (D315 : 78 / 22)")
if manques:
    sys.exit("ABANDON")

C, P, A = "apps/client/src/", "apps/pro/src/", "apps/api/src/"
R = lambda r: ("route", r)  # noqa: E731
M = lambda f, rx: ("motif", f, rx)  # noqa: E731

SONDES = {
    331: [R("POST /venues"), M("packages/types/src/venue.ts", r"bookingMode: z\.nativeEnum\(BookingMode\)|bookingMode:")],
    339: [M(A + "venues/bookings.service.ts", r"conflictIds"), M(P + "venues/booking-requests-section.tsx", r"conflictIds")],
    340: [M("apps/api/prisma/migrations", None), M(A + "venues/bookings.service.ts", r"BOOKING_SLOT_TAKEN")],
    341: [R("GET /pro/venues/:id/services")],
    342: [R("POST /venues/:id/services")],
    343: [R("PATCH /services/:id")],
    # Défaut de la passe 2 : sonde posée sur `booking-charge.ts`, qui DÉLÈGUE la résolution par type à `service-pricing.ts`.
    344: [M(A + "venues/booking-charge.ts", r"resolveServiceLine\(found, choice, input\.guests\)"),
          # Défaut de la passe 3 : les motifs nus trouvaient l'en-tête COMMENTÉ ; ils visent la table de stratégies.
          M(A + "venues/service-pricing.ts", r"^\s*\[ServicePricingType\.PER_GUEST\]:"),
          M(A + "venues/service-pricing.ts", r"^\s*\[ServicePricingType\.TIERED\]:"),
          M(A + "venues/service-pricing.ts", r"^\s*\[ServicePricingType\.PER_UNIT\]:"),
          M(A + "venues/service-pricing.ts", r"^\s*\[ServicePricingType\.FIXED\]:")],
    345: [M(A + "venues/booking-charge.ts", r"totalCents\s*=|totalCents:")],
    351: [R("POST /venues/:id/quotes")],
    353: [M(A + "venues/booking-transitions.ts", r"PENDING|ACCEPTED")],
    354: [M(A + "venues/booking-transitions.ts", r"export function|export const"), M(A + "venues/quote-transitions.ts", r"export function|export const")],
    355: [R("POST /venues/:slug/bookings")],
    357: [R("POST /pro/bookings/:id/accept")],
    358: [R("POST /pro/bookings/:id/decline")],
    365: [R("GET /me/bookings")],
    366: [R("GET /pro/venues/:id/bookings")],
    370: [R("GET /pro/venues/:id/visit-availabilities")],
    371: [R("POST /venues/:id/visit-availabilities")],
    372: [R("POST /venues/:slug/visit-bookings")],
    374: [R("DELETE /pro/venues/:id/visit-bookings/:bookingId")],
    375: [R("GET /pro/venues/:id/visit-bookings")],
    567: [M(A, r"EMAIL_SENDER"), M(A, r"WHATSAPP_SENDER")],
    605: [M(C + "components/site-footer.tsx", r"<footer")],
    620: [M(C + "components/home-view.tsx", r"hm-map"), M(C + "components/home-view.tsx", r"map\.soon")],
    622: [M(C + "components/home-view.tsx", r"hm-how")],
    625: [M(C + "app/[locale]/salles/(recherche)/page.tsx", r"listPublicVenues|getVenues|fetchVenues|searchVenues|venues")],
    626: [M(C + "components/search/search-view.tsx", r'view === "map"')],
    627: [M(C + "components/search/search-view.tsx", r'lowName="guests"')],
    628: [M(C + "components/search/search-view.tsx", r'highName="maxPrice"')],
    629: [M(C + "components/search/search-view.tsx", r"<AmenityIcon")],
    631: [M(C + "components/search/search-view.tsx", r'filters\.reset')],
    632: [M(C + "components/search/search-view.tsx", r"empty|error")],
    633: [M(C + "components/search/search-view.tsx", r'<form method="get"')],
    637: [M(C + "components/venue/matterport-embed.tsx", r"onClick=\{\(\) => setMounted\(true\)\}")],
    639: [M("packages/ui/src/amenity-icon.tsx", r"export function AmenityIcon")],
    642: [M(C + "components/venue/visit-booking-panel.tsx", r"export function VisitBookingPanel")],
    649: [M(C + "components/venue/booking-request-panel.tsx", r'const free = slot\.status === "AVAILABLE"'),
          M(C + "components/venue/booking-request-panel.tsx", r"disabled=\{!free\}")],
    650: [M(C + "components/venue/booking-request-panel.tsx", r'placeholder=\{t\("guests"\)\}')],
    654: [M(C + "components/venue/booking-request-panel.tsx", r'autoComplete="tel"'),
          M(C + "components/venue/booking-request-panel.tsx", r"const complete =")],
    656: [M("packages/i18n/messages/fr.json", r'"submit": "Envoyer ma demande"')],
    657: [M(C + "components/venue/booking-request-panel.tsx", r'\{t\("sentHint"\)\}'),
          M(C + "components/venue/booking-request-panel.tsx", r'href="/compte"')],
    660: [M(C + "components/account/bookings-section.tsx", r"t\(`st_\$\{row\.status\}`\)")],
    661: [M(C + "components/account/visit-bookings-section.tsx", r"listMine\(\)")],
    692: [M(P + "App.tsx", r'path="/demandes"'), M(P + "venues/booking-requests-section.tsx", r"st_\$\{row\.status\}")],
    693: [M(P + "venues/booking-requests-section.tsx", r"requests\.accept"), M(P + "venues/booking-requests-section.tsx", r"requests\.decline")],
    694: [M(P + "venues/booking-requests-section.tsx", r"conflictIds")],
    # Défaut de la passe 5 (vu une fois les commentaires ignorés) : le code d'erreur n'est nommé QU'EN commentaire ; le
    # traitement est en code — `catch` → message de l'API (clé `booking.errors.slotTaken`) → rechargement.
    695: [M(P + "venues/booking-requests-section.tsx", r"setError\(toMessageRef\.current\(cause\)\)"),
          M("packages/i18n/messages/fr.json", r'"slotTaken": "Cette date vient d\'être prise')],
    696: [M(P + "App.tsx", r'path="/calendrier"'), M(P + "venues/venue-calendar.tsx", r"cal-status")],
    697: [M(P + "venues/blocks-section.tsx", r"export function")],
    698: [M(P + "venues/slots-section.tsx", r"export function")],
    699: [M(P + "venues/pricing-rules-editor.tsx", r"export function")],
    700: [M(P + "venues/services-section.tsx", r"pricingType")],
    701: [M(P + "venues/visits-section.tsx", r"export function")],
    702: [M(P + "venues/requests-page.tsx", r"Visit|visit")],
    738: [M(P + "venues/venue-calendar.tsx", r"cal-slot-price")],
    777: [R("POST /venues/:slug/visit-bookings")],
    779: [M(P + "venues/visits-section.tsx", r"export function")],
    780: [M(C + "components/venue/visit-booking-panel.tsx", r"export function VisitBookingPanel")],
    791: [M(C + "app/[locale]/not-found.tsx", r"export default"), M(C + "app/[locale]/[...rest]/page.tsx", r"notFound\(\)")],
    830: [R("POST /admin/venues/:id/publish")],
    832: [R("PATCH /admin/venues/:id/commission-rate")],
    834: [M(A + "venues/venues-admin.controller.ts", r"@Roles\(UserRole\.ADMIN\)"), M(A + "auth/roles.guard.ts", r"class RolesGuard")],
}

# Jugements écrits À LA MAIN, imprimés : une sonde ne juge pas ce que l'entrée DEMANDE au-delà de ce qu'elle trouve.
JUGES = {
    650: ("NE TIENT PAS", "l'entrée demande un sélecteur « ±, min/max » ; le panneau porte un champ numérique libre, sans ± ni "
                          "bornes — D315 l'a noté (« sans ± ») et l'a pourtant classé RÉALISÉ : partiel, pas réalisé"),
    695: ("TIENT", "lu à la main à b5bd382 : `run()` l.83-96 — `catch` → `setError(toMessageRef.current(cause))` → `load()` ; "
                   "la sonde trouve la même expression l.70, dans `load()` : elle prouve l'expression, la lecture prouve le chemin"),
    340: ("TIENT", "la contrainte d'exclusion (`bookings_no_overlap_accepted_confirmed`) est dans les migrations et sa "
                   "violation rend `BOOKING_SLOT_TAKEN` (rang 23, F1)"),
}

routes_par_fichier = {}
ec = show(CODE, PIECE)
entrees = releve(ec)
bl315 = show(D315, "ZWADJ_BACKLOG.md").split("\n")
bl = show(CODE, "ZWADJ_BACKLOG.md").split("\n")
changes = set(git("diff", "--name-only", D315, CODE).split())

print(f"\n== {len(entrees)} entrées « RÉALISÉ » relevées dans {PIECE} ; {len(changes)} fichiers changés {D315}..{CODE}")
tient, tient_pas, introuvables = [], [], []
for n, abrege, lu in entrees:
    n = int(n)
    texte = bl315[n - 1]
    ouvert = texte.startswith("- [ ]")
    # Retrouver l'entrée à HEAD par son texte (sans la case) — les numéros dérivent.
    corps = texte[6:].strip()
    cour = [i + 1 for i, l in enumerate(bl) if l.startswith("- [") and l[6:].strip().startswith(corps[:120])]
    if not ouvert or len(cour) != 1:
        introuvables.append(n)
        print(f"✗ B:{n} {abrege} — case à ffd32e9 {'ouverte' if ouvert else 'NON ouverte'} · à HEAD {len(cour)} ligne(s) (1 attendue)")
        continue
    ligne_cour = cour[0]
    encore_ouvert = bl[ligne_cour - 1].startswith("- [ ]")
    resultats = []
    for s in SONDES[n]:
        if s[0] == "route":
            resultats.append((s[1], s[1] in ROUTES, "carte"))
        else:
            _, f, rx = s
            if rx is None:  # sonde spéciale : la contrainte d'exclusion dans les migrations
                noms = [x for x in git("ls-tree", "-r", "--name-only", CODE, f).split() if x.endswith(".sql")]
                hit = [x for x in noms if "bookings_no_overlap_accepted_confirmed" in show(CODE, x)]
                resultats.append((f"{len(noms)} migrations", bool(hit), hit[0] if hit else "—"))
                continue
            if f.endswith("/"):
                noms = [x for x in git("ls-tree", "-r", "--name-only", CODE, f).split()
                        if re.search(r"\.tsx?$", x) and not re.search(r"\.(spec|test)\.tsx?$", x)]
                hit = next(((x, l) for x in noms for _, l in code_seul(show(CODE, x).split("\n")) if re.search(rx, l)), None)
                resultats.append((f"{rx} dans {f} ({len(noms)} fichiers)", hit is not None,
                                  f"{hit[0]} : {hit[1].strip()[:70]}" if hit else "—"))
            else:
                contenu = show_ou_rien(CODE, f)
                if contenu is None:
                    resultats.append((f, False, "FICHIER ABSENT à ce SHA"))
                    continue
                lignes = contenu.split("\n")
                hit = next(((i, l) for i, l in code_seul(lignes) if re.search(rx, l)), None)
                relu = " (fichier changé depuis ffd32e9 : relu)" if f in changes else ""
                resultats.append((f"{f}{relu}", hit is not None, f"l.{hit[0]} : {hit[1].strip()[:70]}" if hit else "—"))
    sondes_ok = all(ok for _, ok, _ in resultats)
    verdict, motif = JUGES.get(n, ("TIENT" if sondes_ok else "NE TIENT PAS", "sondes" if sondes_ok else "sonde en échec"))
    if verdict == "TIENT" and not sondes_ok:
        verdict, motif = "NE TIENT PAS", "jugement contredit par une sonde"
    (tient if verdict == "TIENT" else tient_pas).append((n, ligne_cour))
    print(f"{'✓' if verdict == 'TIENT' else '✗'} B:{n} → ligne {ligne_cour} à HEAD ({'ouverte' if encore_ouvert else 'DÉJÀ COCHÉE'}) "
          f"· {abrege} · {verdict} — {motif}")
    for quoi, ok, ctx in resultats:
        print(f"      {'✓' if ok else '✗'} {quoi} · {ctx}")

print(f"\n{len(entrees)} entrées · TIENT {len(tient)} · NE TIENT PAS {len(tient_pas)} {[n for n, _ in tient_pas]} · "
      f"introuvables {len(introuvables)} {introuvables} (attendu : total = {len(entrees)})")
print("LIGNES À COCHER (HEAD, b5bd382) : " + " ".join(f"{n}:{l}" for n, l in tient))
