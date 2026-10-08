import io, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
f = r"C:\Users\benla\AppData\Local\Temp\claude\c--Users-benla-Desktop-MyProjct-Zwadj\42edf5f0-47cc-4db3-8b9c-a544206244ab\scratchpad\decouverte-r33-int2.txt"
lignes = io.open(f, encoding="utf-8", errors="replace").read().splitlines()
cible = None
mesure = None
sortie = []
for i, l in enumerate(lignes):
    if l.startswith("■ "):
        cible = l[2:].split(".")[0]
        mesure = None
        continue
    m = re.match(r"^   \[(\S+)\] code (\d+) · (\S+) — (.*)$", l)
    if m:
        mesure = m.group(1)
        sortie.append(f"{cible} [{mesure}] {m.group(3)} {m.group(4)}")
        continue
    if l.startswith("      ") and not l.startswith("         ↳"):
        titre = l.strip()
        # titre = "FAIL  fichier > describe > it"
        morceaux = titre.split(" > ")
        court = " > ".join(morceaux[1:])[:170]
        msg = lignes[i + 1].strip() if i + 1 < len(lignes) else ""
        msg = msg.replace("↳ ", "")
        genre = "A" if msg.startswith("AssertionError") else "?"
        sortie.append(f"      {genre} | {court}\n          {msg[:110]}")
print("\n".join(sortie))
