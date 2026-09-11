"""VERIFICATEUR DE MUTATIONS — une cible de neutralisation POSE-T-ELLE sa mutation ?

    python3 neutralisation/verifier-mutations.py <harnais> [rangs...]
    python3 neutralisation/verifier-mutations.py --tout
    python3 neutralisation/verifier-mutations.py --calibrer

Exemples :
    python3 neutralisation/verifier-mutations.py s11b          # tout le harnais
    python3 neutralisation/verifier-mutations.py s11b 12 13    # deux cibles
    python3 neutralisation/verifier-mutations.py --tout        # les 26 harnais

⛔ POURQUOI CET INSTRUMENT EXISTE. Une cible « muette » a DEUX causes possibles, et
elles appellent des remedes opposes :
  · l'assertion est AVEUGLE au defaut — c'est ce qu'une campagne cherche ;
  · la mutation n'a JAMAIS ete appliquee — remplacement fantome (AGENTS.md : un
    motif ecrit en \n ne remplace rien dans un fichier CRLF pendant que le script
    annonce « fait »).
Sans cet instrument, le fantome FABRIQUE la preuve que le lot cherche : une garde
declaree « muette » alors qu'elle n'a jamais ete mesuree.

Les harnais comptent leurs occurrences AVANT de muter (`vus != attendu` → erreur de
script) ; aucun ne relit son marqueur APRES. C'est cette moitie-la que ce script
produit, et il ne l'invente pas : il rejoue la substitution EN MEMOIRE.

⛔ N'ECRIT RIEN. Aucun fichier n'est ouvert en ecriture, aucune campagne n'est
jouee. C'est ce qui permet de le lancer sur un arbre propre sans le salir.

-------------------------------------------------------------------------------
LA FORME DE LA PREUVE — ANCRE 1 → 0 **ET** MARQUEUR 1 → 2
-------------------------------------------------------------------------------
⚠ SUBTILITE MESUREE, PAS SUPPOSEE, ET C'EST LE CŒUR DE CE FICHIER. Pour une
INTERVERSION, le texte de remplacement EXISTE DEJA dans le fichier — a l'autre
site d'appel. L'assertion naive « apres in contenu » est donc VRAIE AVANT TOUTE
MUTATION : elle ne mesure rien, et elle fabrique exactement la preuve cherchee.
⇒ La preuve porte sur des QUANTITES, jamais sur une presence :
     ancre    : attendu → 0        (elle a disparu)
     marqueur : n → n + attendu    (il a PROGRESSE du bon nombre)
     contenu  : different          (quelque chose a bouge)
⛔ ET PAS SUR LA TAILLE. Une interversion de deux jetons de meme longueur change
ZERO octet de taille : un controle par `len` l'aurait declaree NON POSEE. Cas
reel, releve sur `neutralize-s11b.py` — il est l'un des cas de calibration.

⛔ MAIS CETTE ARITHMETIQUE EST CELLE D'UN SEUL GENRE, ET C'EST UNE MESURE QUI L'A
DIT. Passee sur les 26 harnais, la forme ci-dessus a rendu SIX faux negatifs —
2 suppressions (`apres` est la chaine VIDE : `count("")` rend len + 1) et
4 insertions (`apres` CONTIENT `avant` : l'ancre SURVIT, et c'est correct). Une
seule formule pour trois genres est une garde qui accuse a tort, et une garde qui
accuse a tort finit ignoree. Chaque genre a donc son arithmetique :
     substitution : ancre → 0          · marqueur n → n + attendu
     suppression  : ancre → 0          · marqueur SANS OBJET
     insertion    : ancre → attendu×k  · marqueur SANS OBJET   (k = nb d'ancres
                                         dans le remplacement)

⚠ LE MARQUEUR SE COMPTE HORS DES SITES D'ANCRE. Quand `apres` est une
sous-chaine de `avant` (une suppression d'argument, par exemple), ses occurrences
« avant » sont gonflees par l'ancre elle-meme, et « n + attendu » devient faux. Les
sites d'ancre sont donc neutralises par des NUL — qui preservent les decalages et
ne peuvent creer aucune correspondance — avant de compter le marqueur.

-------------------------------------------------------------------------------
CALIBRATION OBLIGATOIRE — l'instrument ABANDONNE si un seul cas manque son verdict
-------------------------------------------------------------------------------
Des cas synthetiques, en memoire, dont la reponse est connue AVANT de mesurer.
⚠ Leur NOMBRE n'est ecrit nulle part ici : il se compte a l'execution. Un compteur
fige dans le fichier qu'il decrit se perime au premier cas ajoute (D268).
Ils tournent a CHAQUE invocation, jamais sur demande : un instrument qu'on ne
calibre que « quand on y pense » est un instrument non calibre.
  1. POSITIF          — mutation ordinaire             → POSEE
  2. FANTOME CRLF     — ancre en \n nu, harnais qui ne
                        normalise pas                  → NON POSEE
  2b. MEME FIXTURE, harnais qui normalise              → POSEE. Sans ce controle,
                        le rouge du cas 2 pourrait venir d'une fixture inerte.
  3. INTERVERSION     — marqueur deja present ailleurs → POSEE, et la naive est
                        demontree VRAIE AVANT mutation
  4. TAILLE EGALE     — zero octet d'ecart             → POSEE, et le controle par
                        `len` est demontre FAUX-NEGATIF
  5. MARQUEUR INCLUS  — `apres` sous-chaine de `avant` → POSEE, la ou un comptage
                        naif du marqueur rendrait NON POSEE
  6. SUPPRESSION      — `apres` est la chaine VIDE     → POSEE, la ou `count("")`
                        rendrait len + 1 et ferait mentir l'arithmetique
  7. INSERTION        — `apres` CONTIENT `avant`       → POSEE, la ou « ancre → 0 »
                        rendrait NON POSEE une mutation parfaitement appliquee

⚠ LES FIXTURES 3 ET 4 SONT DERIVEES DES CIBLES 11, 12 ET 13 DE `neutralize-s11b.py`,
relevees et non recopiees de memoire — la premiere ecriture de ce fichier portait une
fixture d'interversion INVENTEE, dont le marqueur n'existait nulle part ailleurs :
elle ne modelisait pas une interversion, et c'est la calibration qui l'a dit.

-------------------------------------------------------------------------------
CE QU'IL NE COUVRE PAS, ET IL LE NOMME PLUTOT QUE DE LE TAIRE
-------------------------------------------------------------------------------
· Un harnais SANS garde `if __name__ == "__main__"` n'est pas importe : l'import
  jouerait la campagne entiere. Releve le 11/09/2026 : 3 harnais sur 26.
· Une cible qui RENOMME, CREE ou SUPPRIME un fichier (`genre` de
  `neutralize-404.py`) n'a pas de substitution de texte a prouver. Declaree NON
  COUVERTE, jamais comptee comme posee.
· Il prouve que la mutation SERAIT posee, pas que la garde MORD. Le second est le
  travail du harnais lui-meme.

⛔ CODES DE SORTIE — un vert ne doit jamais couvrir une cible non regardee :
    0 = tout couvert ET tout pose
    1 = au moins une cible NON POSEE, ou la calibration a echoue
    2 = tout ce qui est couvert est pose, mais des cibles sont NON COUVERTES
"""
import importlib.util
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Les harnais resolvent leurs chemins depuis le DOSSIER COURANT, jamais depuis
# __file__ : lance ailleurs, cet instrument lirait des fichiers absents et
# rendrait « ancre absente » sur un arbre parfaitement sain.
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ A LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print("  → python3 neutralisation/verifier-mutations.py <harnais>")
    sys.exit(2)

DOSSIER = "neutralisation"
GARDE_PRINCIPALE = re.compile(r"""if __name__ == ["']__main__["']""")
# Un harnais qui normalise ses motifs multi-lignes le fait de l'une de ces deux
# facons — les deux sont relevees dans le dossier, aucune n'est supposee.
NORMALISE_CRLF = re.compile(r"""replace\(\s*["']\\n["']\s*,\s*["']\\r\\n["']|["']\\r\\n["']\s*\.join""")


# ---------------------------------------------------------------------------
# LE VERDICT — une seule fonction, partagee par la calibration et par le terrain.
# ⚠ C'est delibere : une calibration qui mesurerait un AUTRE code que le terrain
#   ne calibrerait rien (D241, « une garde qui se relit elle-meme »).
# ---------------------------------------------------------------------------
def verdict(contenu, avant, apres, attendu, harnais_normalise=False):
    """Rend (pose: bool, releve: dict). Ne touche a aucun fichier.

    ⚠ `harnais_normalise` DOIT venir de la source du harnais, jamais d'une
    supposition : c'est lui qui separe un motif multi-lignes legitime d'un
    FANTOME. Le mettre en parametre plutot que de decider plus haut est
    delibere — la calibration mesure alors EXACTEMENT le code du terrain.
    """
    r = {"variante": "brut", "motif_normalise": False}

    a_crlf = None
    if "\n" in avant and "\r\n" not in avant:
        a_crlf = (avant.replace("\n", "\r\n"), apres.replace("\n", "\r\n"))

    choisi = None
    if contenu.count(avant) > 0:
        choisi = ("brut", avant, apres)
    elif a_crlf and harnais_normalise and contenu.count(a_crlf[0]) > 0:
        choisi = ("CRLF", a_crlf[0], a_crlf[1])

    if choisi is None:
        fantome = bool(a_crlf) and contenu.count(a_crlf[0]) > 0
        r.update(variante="brut", ancre_avant=0, ancre_apres=0, marqueur_avant=None,
                 marqueur_apres=None, taille=(len(contenu), len(contenu)),
                 fantome=fantome,
                 motif=("FANTOME — le motif est ecrit en \\n nu, le fichier est en CRLF, "
                        "et le harnais ne normalise pas : il remplacerait ZERO occurrence "
                        "en annoncant « fait »")
                 if fantome else "ANCRE ABSENTE — le motif ne correspond a rien dans le fichier")
        return False, r

    nom, a, b = choisi
    r["variante"] = nom
    r["motif_normalise"] = nom == "CRLF"

    # ⛔ TROIS GENRES, ET CHACUN A SON ARITHMETIQUE. Releve le 11/09/2026 sur les
    #   26 harnais : appliquer l'arithmetique de la substitution a tous rendait
    #   SIX faux negatifs — 2 suppressions et 4 insertions, toutes legitimes.
    #   Une seule formule pour trois genres, c'est une garde qui accuse a tort,
    #   et une garde qui accuse a tort finit ignoree.
    genre = "suppression" if b == "" else ("insertion" if a in b else "substitution")
    r["genre"] = genre

    n_av = contenu.count(a)
    mute = contenu.replace(a, b)
    ancre_ap = mute.count(a)

    if genre == "substitution":
        # Marqueur compte HORS des sites d'ancre (voir l'en-tete) : les NUL
        # preservent les decalages et ne peuvent creer aucune correspondance.
        ap_hors = contenu.replace(a, "\x00" * len(a)).count(b)
        ap_ap = mute.count(b)
    else:
        # ⚠ Sur une suppression, `apres` est la chaine VIDE : `count("")` rend
        #   len + 1, et l'arithmetique du marqueur ne veut plus rien dire. Sur une
        #   insertion, le marqueur CONTIENT l'ancre. Dans les deux cas on ne
        #   mesure pas un nombre faux : on declare la quantite sans objet.
        ap_hors = ap_ap = None

    r.update(ancre_avant=n_av, ancre_apres=ancre_ap, marqueur_avant=ap_hors,
             marqueur_apres=ap_ap, taille=(len(contenu), len(mute)))

    raisons = []
    if attendu is not None and n_av != attendu:
        raisons.append(f"ancre comptee {n_av}, le harnais en attend {attendu}")
    if contenu == mute:
        raisons.append("contenu INCHANGE — la mutation serait INERTE")
    if genre == "insertion":
        # L'ancre SURVIT, et c'est le comportement correct : elle est reecrite
        # autant de fois qu'elle figure dans le remplacement.
        attendu_ancre = n_av * b.count(a)
        if ancre_ap != attendu_ancre:
            raisons.append(f"ancre {ancre_ap} fois apres, attendu {attendu_ancre} pour une insertion")
    elif ancre_ap != 0:
        raisons.append(f"ancre encore presente {ancre_ap} fois APRES")
    if genre == "substitution" and ap_ap != ap_hors + n_av:
        raisons.append(f"marqueur {ap_hors} → {ap_ap}, attendu {ap_hors + n_av}")
    r["motif"] = " ; ".join(raisons)
    return not raisons, r


# ---------------------------------------------------------------------------
# CALIBRATION — des cas dont la reponse est connue d'avance (comptes a l'execution).
# ---------------------------------------------------------------------------
def calibrer(bavard=False):
    """⚠ LES FIXTURES 3 ET 4 SONT DERIVEES DE CIBLES REELLES, PAS INVENTEES.

    Premiere ecriture de ce fichier, le 11/09/2026 : la fixture d'interversion
    etait `a: DAY_MS,` → `a: HOUR_MS,`, dont le marqueur n'existait NULLE PART
    ailleurs — elle ne modelisait donc pas une interversion, et le cas ne pouvait
    pas prouver ce pour quoi il existait. La calibration l'a dit (marqueur 0 → 1
    au lieu de 1 → 2). Les fixtures ci-dessous viennent des cibles 11, 12 et 13 de
    `neutralize-s11b.py`, relevees et non recopiees de memoire.
    """
    L = "\r\n"
    echecs = []
    joues = []

    def cas(nom, contenu, avant, apres, attendu, pose_attendu, normalise=False):
        pose, r = verdict(contenu, avant, apres, attendu, harnais_normalise=normalise)
        ok = pose == pose_attendu
        if not ok:
            echecs.append(f"{nom} : verdict {pose}, attendu {pose_attendu} ({r.get('motif', '')})")
        joues.append(nom)
        if bavard:
            marque = "✓" if ok else "✗"
            print(f"   {marque} {nom:32s} → {'POSEE' if pose else 'NON POSEE'}")
        return r

    # 1. POSITIF : mutation ordinaire dans un fichier CRLF.
    c1 = f"alpha{L}const DELAI = DAY_MS;{L}omega{L}"
    cas("1. positif", c1, "const DELAI = DAY_MS;", "const DELAI = HOUR_MS;", 1, True)

    # 2. FANTOME CRLF : l'ancre est ecrite en \n nu, le fichier est en CRLF, et le
    #    harnais NE normalise PAS. Une seule ligne ne suffirait pas — il faut que
    #    le motif TRAVERSE une fin de ligne, ce qui est exactement pourquoi les
    #    fantomes n'apparaissent que sur les motifs multi-lignes.
    c2 = f"alpha{L}premiere ligne{L}seconde ligne{L}omega{L}"
    r2 = cas("2. fantome CRLF (sans normal.)", c2, "premiere ligne\nseconde ligne",
             "REMPLACE", 1, False, normalise=False)
    if not r2.get("fantome"):
        echecs.append("2. fantome CRLF : le cas n'a pas produit de fantome, il ne mesure plus rien")

    # 2b. CONTROLE NEGATIF DU CAS 2 — meme fixture, harnais qui NORMALISE.
    #     Sans lui, le rouge du cas 2 pourrait venir d'une fixture inerte plutot
    #     que du defaut vise : c'est la preuve BILATERALE (D272).
    cas("2b. meme motif, harnais normal.", c2, "premiere ligne\nseconde ligne",
        "REMPLACE", 1, True, normalise=True)

    # 3. INTERVERSION — derivee des cibles 12 et 13 de `neutralize-s11b.py`, dont
    #    l'`apres` de l'une est mot pour mot l'`avant` de l'autre.
    c3 = (f"    expiresAt: echeance({{ windowMs: PRO_RESPONSE_DAYS * DAY_MS }}),{L}"
          f"    paymentDueAt: echeance({{ windowMs: PAYMENT_WINDOW_HOURS * HOUR_MS }}),{L}")
    a3, b3 = "windowMs: PRO_RESPONSE_DAYS * DAY_MS", "windowMs: PAYMENT_WINDOW_HOURS * HOUR_MS"
    r3 = cas("3. interversion", c3, a3, b3, 1, True)
    #    ⛔ ET ON DEMONTRE QUE L'ASSERTION NAIVE AURAIT MENTI : elle porte sur la
    #    PRESENCE du marqueur, deja vraie avant toute mutation.
    if b3 not in c3:
        echecs.append("3. interversion : le marqueur n'est pas deja present, le cas ne prouve rien")
    if r3.get("marqueur_avant") != 1 or r3.get("marqueur_apres") != 2:
        echecs.append(f"3. interversion : marqueur {r3.get('marqueur_avant')} → {r3.get('marqueur_apres')}, attendu 1 → 2")

    # 4. TAILLE EGALE — derivee de la cible 11 : `Math.min` → `Math.max`, zero
    #    octet d'ecart. Le controle par `len` doit etre demontre FAUX-NEGATIF ici,
    #    sinon le cas ne prouve rien.
    c4 = f"  return new Date(Math.min(fromMs + windowMs, eventStartsAt.getTime()));{L}"
    r4 = cas("4. taille egale", c4, "Date(Math.min(", "Date(Math.max(", 1, True)
    av, ap = r4.get("taille", (0, 1))
    if av != ap:
        echecs.append(f"4. taille egale : {av} → {ap}, le cas devait etre a taille CONSTANTE")

    # 5. MARQUEUR INCLUS DANS L'ANCRE : `apres` est une sous-chaine de `avant`.
    c5 = f"appel(a, b);{L}"
    r5 = cas("5. marqueur inclus", c5, "appel(a, b);", "appel(a);", 1, True)
    if r5.get("marqueur_avant") != 0:
        echecs.append(f"5. marqueur inclus : marqueur avant = {r5.get('marqueur_avant')}, attendu 0 (hors sites d'ancre)")

    # 6. SUPPRESSION — derivee de la cible 5 de `neutralize-available-on-api.py`,
    #    dont l'`apres` est la chaine VIDE. Elle a ete declaree NON POSEE par la
    #    premiere version de cet instrument : `"".count()` rend len + 1, et
    #    l'arithmetique du marqueur devient absurde.
    c6 = (f"    where: {{{L}"
          f"      ...(annotateOn === null ? {{}} : {{ slotTemplates: {{ some: ACTIF }} }}),{L}"
          f"      publicationStatus: 'PUBLISHED',{L}    }},{L}")
    a6 = "      ...(annotateOn === null ? {} : { slotTemplates: { some: ACTIF } }),\r\n"
    r6 = cas("6. suppression (apres vide)", c6, a6, "", 1, True)
    if r6.get("genre") != "suppression":
        echecs.append(f"6. suppression : genre lu {r6.get('genre')!r}, attendu 'suppression'")
    if c6.count("") != len(c6) + 1:
        echecs.append("6. suppression : le piege de count('') n'existe plus, le cas ne prouve rien")
    if r6.get("marqueur_avant") is not None:
        echecs.append("6. suppression : le marqueur a ete compte alors qu'il est SANS OBJET")

    # 7. INSERTION — derivee de la cible 1 de `neutralize-solid-s2.py`, dont
    #    l'`apres` CONTIENT l'`avant`. Elle aussi declaree NON POSEE par la
    #    premiere version : l'ancre SURVIT, et c'est le comportement correct.
    c7 = f"    const row = await prisma.notification.create({{{L}"
    a7 = "    const row = await prisma.notification.create({"
    r7 = cas("7. insertion (ancre survit)", c7, a7, "    await send();\n" + a7, 1, True)
    if r7.get("genre") != "insertion":
        echecs.append(f"7. insertion : genre lu {r7.get('genre')!r}, attendu 'insertion'")
    if r7.get("ancre_apres") != 1:
        echecs.append(f"7. insertion : ancre apres = {r7.get('ancre_apres')}, attendu 1 (elle SURVIT)")

    return echecs, len(joues)


# ---------------------------------------------------------------------------
# LECTURE DES HARNAIS
# ---------------------------------------------------------------------------
def harnais_disponibles():
    return sorted(f for f in os.listdir(DOSSIER)
                  if f.startswith("neutralize-") and f.endswith(".py"))


def charger(fichier):
    """Importe un harnais. Rend (module, refus) — l'un des deux est None."""
    chemin = os.path.join(DOSSIER, fichier)
    source = io.open(chemin, encoding="utf-8", newline="").read()
    if not GARDE_PRINCIPALE.search(source):
        return None, "SANS garde __main__ — l'importer JOUERAIT la campagne"
    spec = importlib.util.spec_from_file_location("h_" + fichier[:-3].replace("-", "_"), chemin)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    try:
        spec.loader.exec_module(module)
    except Exception as e:
        return None, f"import impossible : {type(e).__name__}: {str(e)[:100]}"
    if not hasattr(module, "CIBLES"):
        return None, "pas de liste CIBLES"
    module.__source__ = source
    return module, None


def lire_cible(c):
    """Rend (libelle, chemin, avant, apres, attendu, raison_de_non_couverture).

    ⛔ NE DEVINE AUCUN CHAMP PAR POSITION AU-DELA DE CE QUI EST MESURE. Releve le
    11/09/2026 sur les 26 harnais : les tuples partagent tous le meme prefixe
    (libelle, fichier, avant, apres, occurrences) en arite 6 OU 7 — seuls les
    champs suivants varient. Les dicts nomment leur chemin `fichier` ou `chemin`.
    Toute forme hors de ces deux-la est declaree NON COUVERTE, jamais lue de
    travers.
    """
    if isinstance(c, (tuple, list)):
        if len(c) < 5:
            return None, None, None, None, None, f"tuple d'arite {len(c)}, 5 champs attendus au minimum"
        lib, fic, av, ap, att = c[0], c[1], c[2], c[3], c[4]
        if not (isinstance(fic, str) and isinstance(av, str) and isinstance(ap, str)):
            return lib, None, None, None, None, "tuple dont les champs 1-3 ne sont pas des chaines"
        return lib, fic, av, ap, (att if isinstance(att, int) else None), None
    if isinstance(c, dict):
        lib = c.get("libelle", "(sans libelle)")
        genre = c.get("genre")
        if "avant" not in c or "apres" not in c:
            return lib, None, None, None, None, f"cible sans avant/apres (genre={genre!r}) — pas une substitution de texte"
        fic = c.get("fichier") or c.get("chemin")
        if not isinstance(fic, str):
            return lib, None, None, None, None, "cible dict sans champ `fichier` ni `chemin`"
        return lib, fic, c["avant"], c["apres"], c.get("occurrences"), None
    return None, None, None, None, None, f"forme inconnue : {type(c).__name__}"


def verifier(fichier, rangs=None):
    """Rend (poses, non_posees, non_couvertes)."""
    module, refus = charger(fichier)
    print(f"\n{'=' * 78}\n{fichier}")
    if refus:
        print(f"   ⛔ NON COUVERT : {refus}")
        return 0, 0, 1

    cibles = module.CIBLES
    choisis = rangs or range(1, len(cibles) + 1)
    poses = non_poses = non_couverts = 0
    # Releve dans la SOURCE du harnais, jamais suppose : c'est lui qui separe un
    # motif multi-lignes legitime d'un remplacement fantome.
    normalise = bool(NORMALISE_CRLF.search(module.__source__))
    print(f"   normalisation CRLF des motifs par le harnais : {'OUI' if normalise else 'NON'}")

    for rang in choisis:
        if not 1 <= rang <= len(cibles):
            print(f"\n── cible {rang} : ⛔ HORS BORNES (le harnais en compte {len(cibles)})")
            non_couverts += 1
            continue
        lib, chemin, avant, apres, attendu, raison = lire_cible(cibles[rang - 1])
        print(f"\n── cible {rang} : {(lib or '(sans libelle)')[:70]}")
        if raison:
            print(f"   ⛔ NON COUVERTE : {raison}")
            non_couverts += 1
            continue
        if not os.path.isfile(chemin):
            print(f"   ✗ NON POSEE : fichier introuvable — {chemin}")
            non_poses += 1
            continue

        contenu = io.open(chemin, encoding="utf-8", newline="").read()
        pose, r = verdict(contenu, avant, apres, attendu, harnais_normalise=normalise)
        av, ap = r["taille"]
        print(f"   fichier          : {chemin}")
        print(f"   genre            : {r.get('genre', '?')}")
        print(f"   ancre            : {r['ancre_avant']} → {r['ancre_apres']}"
              f"   (le harnais en attend {attendu if attendu is not None else 'NON DECLARE'})"
              + ("   ⚠ elle SURVIT, c'est correct pour une insertion" if r.get("genre") == "insertion" else ""))
        if r["marqueur_avant"] is None:
            print(f"   marqueur         : SANS OBJET pour une {r.get('genre')}")
        else:
            print(f"   marqueur         : {r['marqueur_avant']} → {r['marqueur_apres']}   (hors sites d'ancre)"
                  + ("   ⚠ DEJA PRESENT — une assertion naive serait VRAIE AVANT la mutation"
                     if r["marqueur_avant"] else ""))
        print(f"   taille           : {av} → {ap} octets"
              + ("   ⚠ INCHANGEE — un controle par taille aurait menti" if av == ap and pose else ""))
        if r["motif_normalise"]:
            print("   ⚠ motif multi-lignes : ne correspond qu'en CRLF, et le harnais NORMALISE — legitime")

        if not pose:
            print(f"   ✗ NON POSEE : {r['motif']}")
            non_poses += 1
            continue
        print("   ✓ MUTATION POSEE — l'ancre disparait, le marqueur progresse, le contenu change")
        poses += 1

        # Les lignes reellement modifiees, relevees et non supposees.
        a = avant if r["variante"] == "brut" else avant.replace("\n", "\r\n")
        b = apres if r["variante"] == "brut" else apres.replace("\n", "\r\n")
        for i, (x, y) in enumerate(zip(contenu.split("\r\n"), contenu.replace(a, b).split("\r\n")), start=1):
            if x != y:
                print(f"   ligne {i} :")
                print(f"     -  {x.strip()[:140]}")
                print(f"     +  {y.strip()[:140]}")

    return poses, non_poses, non_couverts


def main():
    args = sys.argv[1:]
    tout = "--tout" in args
    seulement_calibrer = "--calibrer" in args
    args = [a for a in args if not a.startswith("--")]

    print("CALIBRATION — des cas dont la reponse est connue d'avance")
    echecs, nb_cas = calibrer(bavard=True)
    if echecs:
        print("\n⛔ CALIBRATION ECHOUEE — l'instrument ABANDONNE, il ne mesure plus rien :")
        for e in echecs:
            print(f"   ✗ {e}")
        sys.exit(1)
    print(f"   ⇒ les {nb_cas} cas rendent leur verdict connu.")
    if seulement_calibrer:
        sys.exit(0)

    disponibles = harnais_disponibles()
    if tout:
        fichiers, rangs = disponibles, None
    elif args:
        nom = args[0]
        fichier = nom if nom.endswith(".py") else f"neutralize-{nom}.py"
        if fichier not in disponibles:
            print(f"\n✗ harnais inconnu : {fichier}")
            print("  disponibles : " + ", ".join(f[len("neutralize-"):-3] for f in disponibles))
            sys.exit(2)
        fichiers, rangs = [fichier], [int(a) for a in args[1:]] or None
    else:
        print(__doc__)
        sys.exit(2)

    p = n = c = 0
    for f in fichiers:
        a, b, d = verifier(f, rangs)
        p, n, c = p + a, n + b, c + d

    print(f"\n{'=' * 78}")
    print(f"POSEES {p}   ·   NON POSEES {n}   ·   NON COUVERTES {c}")
    if n:
        print("⛔ AU MOINS UNE MUTATION N'EST PAS POSEE — une cible « muette » de ce lot")
        print("   ne prouve RIEN tant que ce compte n'est pas a zero.")
        sys.exit(1)
    if c:
        print("⚠ TOUT CE QUI EST COUVERT EST POSE, mais des cibles restent NON COUVERTES.")
        print("  Sortie en 2, jamais en 0 : un vert couvrirait ce qui n'a pas ete regarde.")
        sys.exit(2)
    print("✓ TOUTES LES MUTATIONS SONT POSEES, ET TOUTES LES CIBLES ONT ETE REGARDEES")
    sys.exit(0)


if __name__ == "__main__":
    main()
