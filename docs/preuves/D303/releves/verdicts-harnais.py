import sys, glob, re
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
# Pour chaque harnais : les lignes de décision autour de l'incrément « mordue ».
fichiers = sorted(glob.glob("neutralisation/neutralize-*.py"))
print("harnais parcourus :", len(fichiers))
RX_INC = re.compile(r"(mordu\s*\+=\s*1|compte\s*\+=\s*1|compte\s*=\s*compte\s*\+\s*1|mord\s*=)")
for f in fichiers:
    lignes = open(f, encoding="utf-8").read().splitlines()
    sites = [i for i, l in enumerate(lignes) if RX_INC.search(l)]
    print(f"\n=== {f} · sites d'incrément/décision : {len(sites)}")
    for i in sites:
        for j in range(max(0, i - 9), i + 1):
            print(f"   {j+1:4d} | {lignes[j][:150]}")
        print("   ----")
