"""D322 — les MESURES D'OUVERTURE du rang 30, prises en lecture seule avant toute ligne de code, versées (D291).

POURQUOI IL EXISTE : quatre décisions du plan en dépendent — le point 1 sans défaut reproduit, le point 2 arrêté, le point
3 conforme, le point 4 corrigé vers `/calendrier`. Écrites seulement dans la section, elles seraient des affirmations ; ici
elles se rejouent. Tout se lit par `git show <sha>:<chemin>` à des SHA FIXÉS — l'arbre de travail, que le lot modifie,
n'est jamais lu. Chaque relevé imprime ce qu'il a parcouru (D290).

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D322/mesures/mesures-ouverture.py > docs/preuves/D322/mesures/mesures-ouverture.txt

CALIBRATION, deux bras (D286) : l'extracteur de lignes est joué sur un motif connu présent et un motif connu absent ;
abandon si un bras manque.
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

D321, AVANT, ORIGINE = "5a362d7", "b5bd382", "909702a"


def show(sha, chemin):
    return subprocess.run(["git", "show", f"{sha}:{chemin}"], capture_output=True, check=True).stdout.decode("utf-8").replace("\r\n", "\n")


def lignes(sha, chemin, motif):
    """(numéro, texte) des lignes qui portent `motif` — et le nombre de lignes parcourues."""
    t = show(sha, chemin).split("\n")
    return [(i + 1, l.strip()) for i, l in enumerate(t) if motif in l], len(t)


def releve(titre, sha, chemin, motif, attendu_min=1):
    trouvees, parcourues = lignes(sha, chemin, motif)
    print(f"  {titre} — {chemin} @{sha} : {parcourues} lignes parcourues · {len(trouvees)} portent « {motif[:60]} » (attendu ≥ {attendu_min})")
    for n, l in trouvees[:6]:
        print(f"      l.{n} : {l[:170]}")
    return trouvees


print("== CALIBRATION")
pos = lignes(D321, "apps/client/src/lib/calendar.ts", "export const WEEKEND_DAYS")[0]
neg = lignes(D321, "apps/client/src/lib/calendar.ts", "zzz-motif-absent-d322")[0]
print(f"  bras positif « export const WEEKEND_DAYS » : {len(pos)} (attendu 1) · bras négatif : {len(neg)} (attendu 0)")
if (len(pos), len(neg)) != (1, 0):
    sys.exit("ABANDON : un bras de calibration manque")

print("\n== POINT 1 — les noms de jours et de mois en arabe")
s = show(D321, "ZWADJ_CONTINUITE.md")
sect = s[s.index("## Session du 01/10/2026 — D321"):]
sect = sect[:sect.index("\n## ", 10)]
plat = re.sub(r"\s+", " ", sect)
print(f"  section D321 : {len(plat)} caractères parcourus")
print(f"  limite déclarée sur l'arabe : « noms de créneaux, de prestations et de paliers restent en FRANÇAIS » présente : "
      f"{'**En arabe, les noms de créneaux, de prestations et de paliers restent en FRANÇAIS**' in plat}")
m = re.findall(r"noms? (?:de|des) (?:jours|mois)[^.]{0,80}(?:français|FRANÇAIS)", plat)
print(f"  une limite sur les noms de JOURS ou de MOIS en français : {len(m)} occurrence(s) (la prémisse du point 1 la cite)")
for chemin, motif in (("apps/client/src/lib/calendar.ts", "new Intl.DateTimeFormat(locale"),
                      ("apps/client/src/lib/booking-calendar.ts", "new Intl.DateTimeFormat(locale"),
                      ("apps/client/src/components/venue/booking-date-picker.tsx", "locale"),
                      ("apps/client/src/app/[locale]/layout.tsx", "<html lang={locale}")):
    releve("source des noms", D321, chemin, motif)

print("\n== POINT 2 — le jour déjà demandé (`REQUESTED`)")
releve("(a) le panneau à sa CRÉATION", ORIGINE, "apps/client/src/components/venue/booking-request-panel.tsx", 'const free = slot.status === "AVAILABLE"')
releve("(a) le panneau AVANT D321", AVANT, "apps/client/src/components/venue/booking-request-panel.tsx", 'const free = slot.status === "AVAILABLE"')
releve("(a) le module de D321", D321, "apps/client/src/lib/booking-calendar.ts", 'slot.status === "AVAILABLE"')
releve("(b) l'API accepte une seconde demande en attente", D321, "apps/api/test/int/bookings.int-spec.ts", "DEUX demandes concurrentes sur la même date coexistent en PENDING")
releve("(b) …les deux réponses attendues", D321, "apps/api/test/int/bookings.int-spec.ts", ".expect(201);")
releve("(c) décision produit", D321, "AGENTS.md", "Chevauchement de créneaux entre demandes")
releve("(c) B3 — l'état REQUESTED", D321, "docs/history/CONTINUITE-flux-A-E.md", "`REQUESTED` ne verrouille rien")
releve("(c) le statut dur", D321, "packages/types/src/booking.ts", "ne grise RIEN")
print("  ⇒ aucune de ces décisions ne dit ce que le PANNEAU du client doit offrir sur un créneau REQUESTED : rien ne tranche.")

print("\n== POINT 3 — le week-end mis en avant")
releve("la vue", D321, "apps/client/src/components/venue/booking-date-picker.tsx", "is-weekend")
releve("la grille", D321, "apps/client/src/lib/calendar.ts", "isWeekend: isWeekend(dayOfWeek)", 3)
releve("l'autorité (D56)", D321, "apps/client/src/lib/calendar.ts", "export const WEEKEND_DAYS")
releve("la décision produit D56", D321, "ZWADJ_CONTINUITE.md", "Le repos hebdomadaire est **vendredi-samedi**")
releve("les règles de prix WEEKDAY : pas de week-end produit", D321, "apps/api/src/venues/pricing-engine.ts", "c'est le pro qui coche")
releve("la seconde copie (pro)", D321, "apps/pro/src/venues/pro-calendar.ts", "export const WEEKEND_DAYS")

print("\n== POINT 4 — le lien mort de l'app Pro")
releve("le lien", D321, "apps/pro/src/venues/edit-venue-page.tsx", "/calendrier")
releve("sa condition d'affichage : la salle chargée", D321, "apps/pro/src/venues/edit-venue-page.tsx", "const venue = state.venue;")
routes = re.findall(r'path="([^"]+)"|path=\{([A-Z_]+)\}', show(D321, "apps/pro/src/App.tsx"))
declarees = [a or b for a, b in routes]
print(f"  routes déclarées dans App.tsx @{D321} : {len(declarees)} — {declarees}")
print(f"  `/salles/:id/calendrier` déclarée : {'/salles/:id/calendrier' in declarees} · `/calendrier` déclarée : {'/calendrier' in declarees} · attrape-tout `*` : {'*' in declarees}")
releve("l'attrape-tout redirige vers /", D321, "apps/pro/src/App.tsx", '<Route path="*" element={<Navigate to="/" replace />} />')
releve("le calendrier existant : la salle COURANTE du sélecteur", D321, "apps/pro/src/venues/calendar-page.tsx", "<VenueCalendar venueId={venue.id} />")
releve("…dont la sélection survit tant que la salle existe, sinon la première", D321, "apps/pro/src/shell/pro-venues-context.tsx", "venues.find((v) => v.id === selectedId) ?? venues[0]!")
releve("le libellé du lien", D321, "packages/i18n/messages/fr.json", '"title": "Calendrier de la salle"')
