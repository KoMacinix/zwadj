import sys, glob, re
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
RX = re.compile(r"""["']((?:apps|packages)/[A-Za-z0-9_./\-\[\]]+\.(?:ts|tsx|sql|css|json))["']""")
fichiers = sorted(glob.glob("neutralisation/neutralize-*.py"))
print("harnais parcourus :", len(fichiers))
for f in fichiers:
    t = open(f, encoding="utf-8").read()
    chemins = sorted(set(RX.findall(t)))
    print(f"\n{f} · chemins littéraux : {len(chemins)}")
    for c in chemins:
        print("   ", c)
