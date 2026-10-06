"""D326 — LECTEUR DES POLICES D'UN PDF (critère (a) de la décision 2 : « la police choisie est EMBARQUÉE dans le PDF, lue par un outil d'inspection et non supposée »).

POURQUOI IL EXISTE. Aucun outil d'inspection de PDF n'est installé sur le poste (mesuré à l'ouverture de D326 : `pdffonts`, `pdftoppm`, `mutool`, `qpdf`, `gs` absents ; Python : `pypdf`, `fitz`, `fontTools`
absents ; seul `pdftotext` existe). Un lecteur sans dépendance est donc ÉCRIT pour la preuve. INSTRUMENTS ÉCARTÉS : installer `pypdf`/`pdfminer` — une dépendance de plus pour une pièce jetable, et un
paquet qu'on n'a pas calibré ; `pdftotext` — il lit du TEXTE, pas la table des polices.

CE QU'IL LIT : chaque objet `N G obj … endobj`, y compris ceux d'un flux d'objets (`/Type /ObjStm`, décompressé), puis les dictionnaires `/Type /Font` (nom, sous-type), leurs descripteurs
(`/FontDescriptor`) et la présence d'un fichier de police (`/FontFile`, `/FontFile2`, `/FontFile3`). Une police est « embarquée » si son descripteur — ou celui de son descendant (`/DescendantFonts`, police
composite `Type0`) — référence un fichier de police. Le préfixe de sous-ensemble (`AAAAAA+`) est retiré à l'affichage, gardé à la lecture.

USAGE : python3 docs/preuves/D326/arabe/pdf-fonts.py <fichier.pdf>…   (depuis la racine) ; imprime, par fichier, les polices et le nombre d'objets lus (D290 : ce qu'il a PARCOURU, à côté du résultat).
CALIBRATION, deux bras par cas (D286), rejouée à chaque lancement, ABANDON si un seul manque : un PDF construit à la main avec une police composite embarquée (positif), une police de base NON
embarquée (négatif : elle doit se lire « non embarquée »), un PDF sans police (négatif : aucune), et le même PDF compressé en flux d'objets (la forme que `Skia` peut écrire).
"""
import re
import sys
import zlib

sys.stdout.reconfigure(encoding="utf-8")

OBJ = re.compile(rb"(\d+)\s+(\d+)\s+obj\b(.*?)\bendobj", re.S)


def objets(pdf: bytes) -> dict:
    """{numéro: texte du dictionnaire (avant le flux éventuel)} — flux d'objets décompressés compris."""
    res = {}
    for m in OBJ.finditer(pdf):
        num, corps = int(m.group(1)), m.group(3)
        dico = corps.split(b"stream", 1)[0]
        res[num] = dico.decode("latin-1")
        if re.search(rb"/Type\s*/ObjStm", dico):
            n = int(re.search(rb"/N\s+(\d+)", dico).group(1))
            premier = int(re.search(rb"/First\s+(\d+)", dico).group(1))
            flux = corps.split(b"stream", 1)[1].lstrip(b"\r\n")
            flux = flux.rsplit(b"endstream", 1)[0]
            try:
                data = zlib.decompress(flux)
            except zlib.error:
                data = zlib.decompressobj().decompress(flux)
            tete = data[:premier].decode("latin-1").split()
            paires = [(int(tete[2 * i]), int(tete[2 * i + 1])) for i in range(n)]
            for i, (inner, off) in enumerate(paires):
                fin = paires[i + 1][1] if i + 1 < n else len(data) - premier
                res[inner] = data[premier + off:premier + fin].decode("latin-1")
    return res


def refs(texte: str, cle: str) -> list:
    m = re.search(cle + r"\s*\[([^\]]*)\]", texte)
    if m:
        return [int(x) for x in re.findall(r"(\d+)\s+\d+\s+R", m.group(1))]
    m = re.search(cle + r"\s+(\d+)\s+\d+\s+R", texte)
    return [int(m.group(1))] if m else []


def polices(pdf: bytes) -> tuple:
    """([(nom, sous-type, embarquée)], nombre d'objets lus)."""
    objs = objets(pdf)
    sortie = []
    for num, t in sorted(objs.items()):
        if not re.search(r"/Type\s*/Font\b(?!Descriptor)", t):
            continue
        nom = re.search(r"/BaseFont\s*/([^\s/\[\]<>()]+)", t)
        sous = re.search(r"/Subtype\s*/([A-Za-z0-9]+)", t)
        if not nom:
            continue
        candidats = [t] + [objs.get(r, "") for r in refs(t, "/DescendantFonts")]
        embarquee = False
        for c in candidats:
            for d in refs(c, "/FontDescriptor"):
                if re.search(r"/FontFile[23]?\b", objs.get(d, "")):
                    embarquee = True
        sortie.append((nom.group(1), sous.group(1) if sous else "?", embarquee))
    return sortie, len(objs)


def sans_prefixe(nom: str) -> str:
    return re.sub(r"^[A-Z]{6}\+", "", nom)


# ── Calibration ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
def fabrique(*objs: str, compresse: bool = False) -> bytes:
    if not compresse:
        return b"%PDF-1.4\n" + b"".join(f"{i + 1} 0 obj\n{o}\nendobj\n".encode("latin-1") for i, o in enumerate(objs)) + b"%%EOF"
    corps = "".join(objs[i] + " " for i in range(len(objs)))
    offs, courant = [], 0
    for o in objs:
        offs.append(courant)
        courant += len(o) + 1
    tete = " ".join(f"{i + 1} {offs[i]}" for i in range(len(objs))) + " "
    flux = zlib.compress((tete + corps).encode("latin-1"))
    return (b"%PDF-1.5\n" + f"9 0 obj\n<< /Type /ObjStm /N {len(objs)} /First {len(tete)} /Length {len(flux)} /Filter /FlateDecode >>\nstream\n".encode() + flux + b"\nendstream\nendobj\n%%EOF")


COMPOSITE = [
    "<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAA+ReadexPro-Regular /Encoding /Identity-H /DescendantFonts [ 2 0 R ] >>",
    "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+ReadexPro-Regular /FontDescriptor 3 0 R >>",
    "<< /Type /FontDescriptor /FontName /AAAAAA+ReadexPro-Regular /FontFile2 4 0 R >>",
    "<< /Length 0 >>"
]
BASE14 = ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
SANS_POLICE = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [] /Count 0 >>"]

print("== CALIBRATION — deux bras par cas, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


bras("police composite embarquée (positif : le type 0 ET son descendant se lisent embarqués)", polices(fabrique(*COMPOSITE))[0], [("AAAAAA+ReadexPro-Regular", "Type0", True), ("AAAAAA+ReadexPro-Regular", "CIDFontType2", True)])
SANS_FICHIER = [COMPOSITE[0], COMPOSITE[1], "<< /Type /FontDescriptor /FontName /AAAAAA+ReadexPro-Regular >>"]
bras("police composite dont le descripteur ne référence AUCUN fichier de police (négatif : non embarquée)", [e for _, _, e in polices(fabrique(*SANS_FICHIER))[0]], [False, False])
bras("police de base non embarquée (négatif : se lit « non embarquée »)", polices(fabrique(*BASE14))[0], [("Helvetica", "Type1", False)])
bras("PDF sans police (négatif : aucune)", polices(fabrique(*SANS_POLICE))[0], [])
bras("même police composite dans un flux d'objets compressé", [(n, s, e) for n, s, e in polices(fabrique(*COMPOSITE, compresse=True))[0] if s == "Type0"], [("AAAAAA+ReadexPro-Regular", "Type0", True)])
bras("préfixe de sous-ensemble retiré", sans_prefixe("AAAAAA+ReadexPro-Regular"), "ReadexPro-Regular")
bras("pas de préfixe : inchangé", sans_prefixe("Helvetica"), "Helvetica")
if not all(cal):
    sys.exit(f"CALIBRATION : {cal.count(False)} bras manqué(s) — le lecteur ne juge pas")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

for chemin in sys.argv[1:]:
    pdf = open(chemin, "rb").read()
    lues, n = polices(pdf)
    pages = len(re.findall(rb"/Type\s*/Page\b(?!s)", pdf))
    print(f"{chemin} — {len(pdf)} octets · {n} objets lus · {pages} page(s) · {len(lues)} police(s) :")
    for nom, sous, emb in lues:
        print(f"   {'EMBARQUÉE ' if emb else 'non embarquée'} {sous:14} {nom}")
