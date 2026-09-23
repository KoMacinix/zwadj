"""Retire de `a-verser/` ce qui est versé — D303, consigne de Ko : « retires-en ce qui est versé, après avoir vérifié
les SHA-256 contre les copies versées ». Depuis la racine : python3 docs/preuves/D303/outils/retirer-verses.py
Un fichier n'est supprimé QUE si son empreinte est égale à celle de sa copie versée ET à l'empreinte attendue
épinglée ici (celles que D302 et D303 ont écrites) ; sinon il reste, et c'est dit. Le dossier `a-verser/` reste."""
import hashlib
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO."); sys.exit(2)
PAIRES = [
    ("a-verser/zwadj-solid-strategy-audit.md", "docs/preuves/D302/sources/zwadj-solid-strategy-audit.md",
     "f2ab7a58012e06068d5c3e2829006e83a1c9b6dbd2001aa2aa14bf4eb76ae3f9"),
    ("a-verser/zwadj-audit-securite.md", "docs/preuves/D302/sources/zwadj-audit-securite.md",
     "f53fe074e750afc535d18592637ddc01678671ee65a070fd3971d88ee03e38c8"),
    ("a-verser/zwadj-audit-evidence.zip", "docs/preuves/D303/sources/zwadj-audit-evidence.zip",
     "2a871c216296a5d648270baddc00e9e05c8813b2e20f0542747c9f00993b6d16"),
]


def h(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


print(f"== fichiers dans a-verser/ avant : {sorted(os.listdir('a-verser'))}")
retires = 0
for src, verse, attendu in PAIRES:
    hs, hv = h(src), h(verse)
    ok = hs == hv == attendu
    print(f"{'✓' if ok else '✗'} {src} : {hs[:16]}… · versé {verse} : {hv[:16]}… · attendu {attendu[:16]}… ⇒ "
          f"{'SUPPRIMÉ' if ok else 'CONSERVÉ'}")
    if ok:
        os.remove(src)
        retires += 1
print(f"== retirés : {retires} (attendu {len(PAIRES)}) · reste dans a-verser/ : {sorted(os.listdir('a-verser'))}")
sys.exit(0 if retires == len(PAIRES) else 1)
