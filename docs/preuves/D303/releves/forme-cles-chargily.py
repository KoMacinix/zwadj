import sys, subprocess, re
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
# Forme des jetons au format des clés Chargily Pay v2, où qu'ils soient dans la ligne,
# quel que soit le séparateur. N'IMPRIME JAMAIS le jeton : seulement préfixe de FORMAT
# (test|live)_(pk|sk), longueur du corps, classes de caractères.
RX = re.compile(r"\b(test|live)_(pk|sk)_([A-Za-z0-9]+)")

def forme(texte):
    out = []
    for m in RX.finditer(texte):
        body = m.group(3)
        classes = "".join(k for k, rx in (("a", r"[a-z]"), ("A", r"[A-Z]"), ("9", r"[0-9]")) if re.search(rx, body))
        out.append(f"{m.group(1)}_{m.group(2)} corps={len(body)} classes={classes}")
    return out

# Calibration, deux bras : un jeton synthétique DOIT sortir, un texte sans jeton NON.
pos = forme("# cle : test_sk_" + "Ab1" * 13 + "x")
neg = forme("CHARGILY_SECRET_KEY=  # test_sk_ seul, sans corps ; sk_test_abc hors format")
assert pos == ["test_sk corps=40 classes=aA9"], pos
assert neg == [], neg
print("calibration 2 bras sur 2 : positif", pos, "| negatif", neg)

commits = subprocess.run(["git", "log", "--format=%h", "--all", "--", "apps/api/.env.example"],
                         capture_output=True, text=True, encoding="utf-8").stdout.split()
lignes = 0
for c in commits:
    r = subprocess.run(["git", "show", f"{c}:apps/api/.env.example"], capture_output=True, text=True, encoding="utf-8")
    t = r.stdout
    lignes += len(t.splitlines())
    f = forme(t)
    print(c, "| lignes", len(t.splitlines()), "| jetons au format :", len(f), f)
print("commits parcourus", len(commits), "| lignes parcourues", lignes)

# Où ces jetons existent-ils encore ? Compte seul, sans imprimer.
tracked = subprocess.run(["git", "grep", "-l", "-E", r"(test|live)_(pk|sk)_[A-Za-z0-9]{20,}", "HEAD"],
                         capture_output=True, text=True, encoding="utf-8").stdout.split()
print("fichiers suivis a HEAD portant un jeton au format (corps >= 20) :", len(tracked), tracked)
nb_files = len(subprocess.run(["git", "ls-files"], capture_output=True, text=True, encoding="utf-8").stdout.splitlines())
print("fichiers suivis parcourus a HEAD :", nb_files)
contains = subprocess.run(["git", "branch", "-a", "--contains", "d52c721"], capture_output=True, text=True, encoding="utf-8").stdout.split()
print("branches contenant d52c721 :", contains)
