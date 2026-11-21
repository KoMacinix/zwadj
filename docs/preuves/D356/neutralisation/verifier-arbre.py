import io, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
CIBLES = []
def cible(libelle, fichier, avant, apres, mesures, genre="substitution"):
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "genre": genre, "mesures": mesures})
env = {"cible": cible,
 "PIN": "apps/api/src/staff/staff-pin.ts", "HACHEUR": "apps/api/src/staff/staff-pin-hasher.ts", "ETAT": "apps/api/src/staff/staff-account-state.ts",
 "ENV": "apps/api/src/config/env.ts", "ENVEX": "apps/api/.env.example", "THROTTLE": "apps/api/src/auth/auth.throttle.ts", "TYPES": "packages/types/src/staff.ts",
 "ARJSON": "packages/i18n/messages/ar.json", "CLIENT": "packages/api-client/src/staff-client.ts", "SERVICE": "apps/api/src/staff/staff-session.service.ts",
 "MAGASIN": "apps/api/src/staff/staff-store.prisma.ts", "CONTROLEUR": "apps/api/src/staff/staff-session.controller.ts", "QSTORE": "apps/api/src/venues/quote-store.prisma.ts",
 "QSVC": "apps/api/src/venues/quotes.service.ts", "QCTRL": "apps/api/src/venues/quotes.controller.ts"}
exec(open(sys.argv[1], encoding="utf-8").read(), env)
defauts = []
for c in CIBLES:
    src = io.open(c["fichier"], encoding="utf-8", newline="").read()
    adapt = (lambda t: t.replace("\n", "\r\n")) if "\r\n" in src else (lambda t: t)
    avant, apres = adapt(c["avant"]), adapt(c["apres"])
    n, m = src.count(avant), src.count(apres)
    if n != 1:
        defauts.append(f"{c['libelle'][:6]} : ancre ×{n} dans {c['fichier']}"); continue
    if apres in avant:
        defauts.append(f"{c['libelle'][:6]} : le remplacement est une SOUS-CHAÎNE de l'ancre"); continue
    mute = src.replace(avant, apres)
    n2, m2 = mute.count(avant), mute.count(apres)
    att = 1 if c["genre"] == "insertion" else 0
    if (n2, m2) != (att, m + 1):
        defauts.append(f"{c['libelle'][:6]} : NON POSÉE ancre {n}→{n2} marqueur {m}→{m2}")
print(f"cibles examinées : {len(CIBLES)} ; défauts : {len(defauts)} (attendu 0)")
for d in defauts: print("  ✗", d)
