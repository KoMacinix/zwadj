# D306 — session ADVERSE de 23a. NEUTRALISATION À LA MAIN, indépendante du harnais de D305.
# Les mutations ci-dessous sont ÉCRITES PAR CETTE SESSION d'après l'INTENTION de chaque cible
# (cadrage du rang 23, § 5) — aucune ancre n'est importée de `neutralize-rang23.py` ni de
# `neutralize-solid-s5b.py`. Plus des mutations ADVERSES (X…) que D305 n'a pas essayées.
#
# Usage, depuis la racine :  python docs/preuves/D306/outils/neutraliser.py <id> [<id>...]
#
# Par cible, dans cet ordre, tout imprimé :
#   1. refus si le fichier visé est sale (`git status`) ;
#   2. pour chaque édition : l'ANCRE doit apparaître EXACTEMENT UNE fois dans la région
#      (après `apres` s'il est donné, lui-même unique) ; le MARQUEUR est compté AVANT ;
#   3. écriture, RELECTURE du fichier, preuve de POSE (D286, forme « ancre n → m ET marqueur
#      n → n + Δ » — jamais une présence, jamais une taille) ;
#   4. la mesure, sortie brute versée (lancer.py) ;
#   5. RESTAURATION des octets d'origine dans un `finally`, SHA-256 comparé, `git status` vide ;
#   6. LECTURE de la sortie par `lire.py` (calibré), titres attendus exigés chacun.
# ⚠ Un processus TUÉ entre 3 et 5 laisse le fichier muté : `git checkout HEAD -- <fichier>` le
#   rend (HEAD est la sauvegarde), et l'étape 1 refuse toute cible suivante sur un fichier sale.
import hashlib
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lire import rapport  # noqa: E402
from titres import TITRES  # noqa: E402

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

LOCKS = "apps/api/src/venues/booking-locks.prisma.ts"
SERVICE = "apps/api/src/venues/bookings.service.ts"
TRANS = "apps/api/src/venues/booking-transitions.ts"
NL = "\r\n"  # les trois fichiers sont en CRLF (relevé en octets : CRLF = LF sur chacun)
VERROU = "await tx.$queryRaw`SELECT id FROM venues WHERE id = ${input.venueId}::uuid FOR UPDATE`;"
ACCEPT_SVC = "async accept(userId: string, bookingId: string)"
RELECTURE_TRANSITION = "La relecture est l'AUTORITÉ"
SANS_T5 = "^(?!.*" + "MD-F1-5 — un BLOCAGE" + ")"
SANS_T4 = "^(?!.*" + "MD-F1-8 — l'ORDRE" + ")"


def E(ancre, remplacement, apres=None, marqueur=None, delta=1, ancre_apres=0):
    return dict(ancre=ancre, remplacement=remplacement, apres=apres,
                marqueur=marqueur if marqueur is not None else remplacement, delta=delta, ancre_apres=ancre_apres)


# id : (fichier, [éditions], mesure, [clés de titres attendus], filtre -t ou None, intention)
CIBLES = {
    # ── Les sept gardes neuves ou réorientées de 23a, écrites d'après leur INTENTION ─────────────
    "R23-F1-a": (LOCKS, [E("where: { id: input.bookingId, status: { in: [...input.allowedFrom] } },",
                           "where: { id: input.bookingId },")],
                 "int", ["T1", "T2"], None, "l'écriture d'accept perd sa condition de statut"),
    "R23-F1-b": (LOCKS, [E("if (ecrit.count !== 1) {", "if (ecrit.count !== 1 && false) {")],
                 "int", ["T1", "T2"], None, "un compte 0 n'est plus un refus : la ligne relue part acceptée"),
    "R23-F5-a": (SERVICE, [E("from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason),",
                             "from: allowedFrom(BookingCommand.CANCEL_AS_CLIENT),")],
                 "int", ["T3"], None, "l'annulation client écrit depuis tout son from, motif ou non"),
    "R23-F5-b": (SERVICE, [E('if (decision.outcome === "REASON_REQUIRED") {',
                             'if (decision.outcome === "REASON_REQUIRED" && false) {')],
                 "int", ["T3"], None, "après un compte 0, toujours 409 : le motif n'est plus redécidé"),
    "R23-F5-c": (TRANS, [E('(status) => decideBookingTransition(command, status, reason).outcome === "ALLOWED"',
                           '(status) => decideBookingTransition(command, status, "motif").outcome === "ALLOWED"')],
                 "unit", ["U1", "U2"], None, "la fonction pure des statuts inscriptibles ignore le motif"),
    "S5b-2": (LOCKS, [E("if (!input.allowedFrom.includes(fresh.status)) {",
                        "if (false && !input.allowedFrom.includes(fresh.status)) {")],
              "int", ["T4"], None, "la relecture D117 ne juge plus"),
    "S5b-1": (LOCKS, [E(VERROU, "/* D306 : verrou de salle retiré */")],
              "int", ["T5"], None, "le verrou de salle saute"),
    # ── Rejeu des deux inférences de D305 : S5b-1 et S5b-2 étaient-elles muettes SANS T5 / T4 ? ──
    "S5b-1-sans-T5": (LOCKS, [E(VERROU, "/* D306 : verrou de salle retiré */")],
                      "int", [], SANS_T5, "S5b-1, T5 exclu par filtre : muette attendue (D305)"),
    "S5b-2-sans-T4": (LOCKS, [E("if (!input.allowedFrom.includes(fresh.status)) {",
                                "if (false && !input.allowedFrom.includes(fresh.status)) {")],
                      "int", [], SANS_T4, "S5b-2, T4 exclu par filtre : muette attendue (D305)"),
    # ── Mutations ADVERSES (non essayées par D305) ────────────────────────────────────────────
    "X1-relecture-accept": (LOCKS, [E('return { outcome: "STATUS_CONFLICT", status: relu.status };',
                                      'return { outcome: "STATUS_CONFLICT", status: fresh.status };')],
                            "int", ["T1", "T2"], None,
                            "après un compte 0, accept rend le statut PÉRIMÉ (lu avant l'écriture), pas la relecture"),
    "X2a-relecture-transition-const": (LOCKS, [E('return { outcome: "STATUS_CONFLICT", status: fresh.status };',
                                                 'return { outcome: "STATUS_CONFLICT", status: "ACCEPTED" };',
                                                 apres=RELECTURE_TRANSITION)],
                                       "int", [], None,
                                       "la relecture de `transition` rend toujours ACCEPTED (hypothèse : rien ne rougit)"),
    "X2b-relecture-transition-from0": (LOCKS, [E('return { outcome: "STATUS_CONFLICT", status: fresh.status };',
                                                 'return { outcome: "STATUS_CONFLICT", status: input.from[0] };',
                                                 apres=RELECTURE_TRANSITION)],
                                       "int", ["T3"], None,
                                       "la relecture de `transition` rend le premier statut source"),
    "X3-writableFrom-plus-DECLINED": (TRANS, [E(
        "export function writableFrom(command: BookingCommand, reason?: string): readonly BookingStatus[] {",
        "export function writableFrom(command: BookingCommand, reason?: string): readonly BookingStatus[] {" + NL
        + "  return [...writableFromD306(command, reason), BookingStatus.DECLINED];" + NL + "}" + NL
        + "function writableFromD306(command: BookingCommand, reason?: string): readonly BookingStatus[] {",
        marqueur="writableFromD306", delta=2, ancre_apres=1)],
        "unit", ["U1", "U2"], None, "la fonction pure élargie d'un statut HORS de `from`"),
    "X4-service-plus-DECLINED": (SERVICE, [E("from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason),",
                                             'from: [...writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason), "DECLINED" as BookingStatus],')],
                                 "int", [], None,
                                 "le prédicat de l'annulation client élargi à DECLINED au site d'appel (hypothèse : rien ne rougit)"),
    "X4b-service-plus-CANCELLED": (SERVICE, [E("from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason),",
                                               'from: [...writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason), "CANCELLED" as BookingStatus],')],
                                   "int", ["D121C"], None, "le même, élargi à CANCELLED"),
    "X7-perdant-publie": (SERVICE, [E('if (resultat.outcome === "STATUS_CONFLICT") {',
                                      'if (resultat.outcome === "STATUS_CONFLICT") { await this.events.publish("booking.accepted", await this.notificationFor(row, venue, null));',
                                      apres=ACCEPT_SVC, marqueur="await this.notificationFor(row, venue, null)", ancre_apres=1)],
                          "int", ["T1", "T2", "D117X2"], None, "le PERDANT d'accept publie « acceptée » avant son 409"),
    "X8-verrou-apres-blocage": (LOCKS, [E(VERROU, "/* D306 : verrou déplacé */"),
                                        E('if (block) return { outcome: "BLOCKED_PERIOD" };',
                                          'if (block) return { outcome: "BLOCKED_PERIOD" };' + NL + "      " + VERROU,
                                          marqueur=VERROU, ancre_apres=1)],
                                "int", ["T5"], None,
                                "le verrou de salle pris APRÈS le contrôle de blocage : la requête ATTEND le rival (branche « bloquée » de courirOuAboutir)"),
    "X10-decision-sur-ACCEPTED": (SERVICE, [E("const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, resultat.status, input.reason);",
                                              'const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, "ACCEPTED", input.reason);')],
                                  "int", [], None,
                                  "après un compte 0, le code se choisit comme si le statut relu était ACCEPTED (hypothèse : rien ne rougit)"),
    "X4-sonde": (SERVICE, [E("from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason),",
                             'from: [...writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason), "DECLINED" as BookingStatus],')],
                 "sonde", ["P1", "P1b", "P2", "P3"], None, "X4 rejouée sur la SONDE (hors suite)"),
    "X10-sonde": (SERVICE, [E("const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, resultat.status, input.reason);",
                              'const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, "ACCEPTED", input.reason);')],
                  "sonde", ["P1", "P2", "P11"], None, "X10 rejouée sur la SONDE (hors suite)"),
    "X14-statut-du-400": (SERVICE, [E("          status: decision.status" + NL + "        });" + NL + "      }" + NL + "      throw new ConflictException({",
                                      '          status: "PENDING"' + NL + "        });" + NL + "      }" + NL + "      throw new ConflictException({",
                                      marqueur='status: "PENDING"')],
                          "int", [], None,
                          "le 400 de l'annulation client porte un statut FAUX (PENDING) au lieu du statut relu (hypothèse : rien ne rougit)"),
    "X15-motif-ignore-au-site": (SERVICE, [E("from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason),",
                                             "from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, undefined),")],
                                 "int", [], None,
                                 "MD-F5-2 : le site d'appel ignore le motif — AVEC motif, une ACCEPTED ne s'annule plus (hypothèse : seul SEQ400 rougit, par supertest)"),
    "X15-sonde": (SERVICE, [E("from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason),",
                              "from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, undefined),")],
                  "sonde", ["P4"], None, "X15 rejouée sur la SONDE (hors suite)"),
    "X12-23P01-non-traduit": (LOCKS, [E('if (isExclusionViolation(error)) return { outcome: "SLOT_TAKEN" };',
                                        'if (false && isExclusionViolation(error)) return { outcome: "SLOT_TAKEN" };')],
                              "int", ["DIFF"], None, "MD-F1-3 : la traduction du 23P01 levé par updateMany retirée"),
    "X13-accept-plus-DECLINED": (LOCKS, [E("where: { id: input.bookingId, status: { in: [...input.allowedFrom] } },",
                                           'where: { id: input.bookingId, status: { in: [...input.allowedFrom, "DECLINED"] } },')],
                                 "int", ["T1"], None, "l'écriture d'accept admet DECLINED, et lui seul : T1 seul doit rougir"),
}

MESURES = {
    "int": ["test/int/bookings.int-spec.ts", "-c", "vitest.config.int.ts"],
    # La SONDE de D306, hors suite : pour montrer qu'un défaut que la suite laisse passer est OBSERVABLE.
    "sonde": ["-c", "vitest.config.int.ts", "--dir", os.path.abspath("docs/preuves/D306/sondes"), "adverse-23a"],
    "unit": ["src/venues/booking-transitions.spec.ts"],
}


def git(*a: str) -> str:
    return subprocess.run(["git", *a], capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def appliquer(texte: str, e: dict) -> tuple:
    """Applique UNE édition ; rend (texte muté, ligne de preuve, preuve tenue ?). La preuve se calcule
    ICI, sur le texte d'avant et d'après CETTE édition : une édition suivante peut réinsérer l'ancre
    d'une précédente (X8), et un compte global la confondrait."""
    debut = 0
    if e["apres"]:
        n_apres = texte.count(e["apres"])
        if n_apres != 1:
            raise SystemExit(f"ERREUR : repère `apres` trouvé {n_apres} fois (attendu 1) : {e['apres']}")
        debut = texte.index(e["apres"])
    region = texte[debut:]
    n_ancre = region.count(e["ancre"])
    # Sans `apres`, l'ancre doit être UNIQUE dans tout le fichier ; avec `apres`, c'est la première après lui.
    if (e["apres"] is None and n_ancre != 1) or n_ancre < 1:
        raise SystemExit(f"ERREUR : ancre trouvée {n_ancre} fois dans la région (attendu 1) : {e['ancre']}")
    m_avant = texte.count(e["marqueur"])
    pos = debut + region.index(e["ancre"])
    mute = texte[:pos] + e["remplacement"] + texte[pos + len(e["ancre"]):]
    a_apres = mute[debut:].count(e["ancre"]) - (n_ancre - 1)  # occurrences de l'ancre VISÉE qui subsistent
    m_apres = mute.count(e["marqueur"])
    bon = a_apres == e["ancre_apres"] and m_apres == m_avant + e["delta"]
    ligne = (f"  POSE {'✓' if bon else '✗'} ancre 1 → {a_apres} (attendu {e['ancre_apres']}) · "
             f"marqueur {m_avant} → {m_apres} (attendu {m_avant + e['delta']}) · ancre : {e['ancre'][:70]}")
    return mute, ligne, bon


def jouer(cid: str) -> str:
    fichier, editions, mesure, attendus, filtre, intention = CIBLES[cid]
    out = [f"=== {cid} — {intention}", f"FICHIER={fichier}"]
    if git("status", "--porcelain", "--", fichier):
        out.append("REFUS : fichier sale avant mutation.")
        return "\n".join(out)
    origine = open(fichier, "rb").read()
    h0 = sha(origine)
    texte = origine.decode("utf-8")
    posee = True
    for e in editions:
        texte, ligne, bon = appliquer(texte, e)
        out.append(ligne)
        posee = posee and bon
    sortie = os.path.abspath(f"docs/preuves/D306/neutralisation/{cid}-{mesure}.txt")
    try:
        with open(fichier, "wb") as f:
            f.write(texte.encode("utf-8"))
        relu = open(fichier, "rb").read()
        ecrit = relu == texte.encode("utf-8") and relu != origine
        out.append(f"  RELU = texte muté, octet pour octet : {'OUI' if ecrit else 'NON'} "
                   f"(sha256 {sha(origine)[:12]} → {sha(relu)[:12]})")
        posee = posee and ecrit
        out.append(f"MUTATION={'POSÉE' if posee else 'NON POSÉE'}")
        if not posee:
            return "\n".join(out)
        os.environ["D306_ETIQUETTE"] = cid  # la sonde nomme son journal d'après la cible
        cmd = ["node", "node_modules/vitest/vitest.mjs", "run", *MESURES[mesure]]
        if filtre:
            cmd += ["-t", filtre]
        r = subprocess.run([sys.executable, os.path.abspath("docs/preuves/D306/outils/lancer.py"), sortie, "apps/api", "--", *cmd],
                           capture_output=True, text=True, encoding="utf-8")
        out.append(r.stdout.strip())
        out.append(f"COMMANDE=(apps/api) {' '.join(cmd)}")
    finally:
        with open(fichier, "wb") as f:
            f.write(origine)
        h1 = sha(open(fichier, "rb").read())
        st = git("status", "--porcelain", "--", fichier)
        out.append(f"RESTAURE sha256 {h0[:16]} → {h1[:16]} {'IDENTIQUE' if h0 == h1 else 'DIFFÉRENT'} · git status "
                   f"{'vide' if not st else st} ⇒ {'RESTAURATION PROUVÉE' if h0 == h1 and not st else 'ÉCHEC'}")
    out.append(rapport(sortie, [TITRES[k] for k in attendus]))
    return "\n".join(out)


def main() -> int:
    if not os.path.exists("pnpm-workspace.yaml"):
        print("ABANDON : à lancer depuis la racine.")
        return 1
    ids = sys.argv[1:] or list(CIBLES)
    os.makedirs("docs/preuves/D306/neutralisation", exist_ok=True)
    for cid in ids:
        texte = jouer(cid)
        print(texte + "\n", flush=True)
        with open(f"docs/preuves/D306/neutralisation/{cid}-lecture.txt", "w", encoding="utf-8", newline="\n") as f:
            f.write(texte + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
