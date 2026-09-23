import sys, subprocess, importlib.util, re
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
# Les onze motifs de l'audit de secrets (D293/D298) voient-ils le cas réel de D200 ?
# Compte seul, aucune valeur imprimée.
spec = importlib.util.spec_from_file_location("audit_secrets", "neutralisation/audit-secrets.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
print("motifs chargés :", len(mod.MOTIFS))
RX_FORME = re.compile(r"\b(test|live)_(pk|sk)_[A-Za-z0-9]{20,}")
for c in ("dc63afb", "d52c721"):
    brut = subprocess.run(["git", "show", f"{c}:apps/api/.env.example"], capture_output=True).stdout
    texte = brut.decode("utf-8", errors="replace")
    formes = len(RX_FORME.findall(texte))
    par = mod.compter(brut)
    # Les lignes qui portent un jeton au format : que voient les motifs SUR ELLES ?
    lignes_cles = [l for l in texte.splitlines() if RX_FORME.search(l)]
    sur_cles = mod.compter("\n".join(lignes_cles).encode("utf-8"))
    print(f"{c} : octets {len(brut)} · jetons au format Chargily (compte à part) {formes} · alertes du fichier "
          f"{sum(par.values())} ({', '.join(f'{k}={v}' for k, v in par.items() if v) or 'aucune'})")
    print(f"      sur les {len(lignes_cles)} lignes porteuses : alertes {sum(sur_cles.values())} "
          f"({', '.join(f'{k}={v}' for k, v in sur_cles.items() if v) or 'aucune'}) (attendu >= {len(lignes_cles)} si les motifs voient ce cas)")
