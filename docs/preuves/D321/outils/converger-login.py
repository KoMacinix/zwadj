"""Rang 29 (D321) — fait passer chaque lien de connexion par `LOGIN_PATH`. Compte chaque ancre AVANT, relit APRÈS (D289)."""
import io
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

JSX_CLIENT = ('href="/auth/connexion"', "href={LOGIN_PATH}")
PRO_URL = ("href={`${PRO_URL}/auth/connexion`}", "href={`${PRO_URL}${LOGIN_PATH}`}")
TO_PRO = ('to="/auth/connexion"', "to={LOGIN_PATH}")

# fichier → (chemin d'import de `routes`, [(ancre, remplacement, occurrences attendues)])
PLAN = {
    "apps/client/src/app/[locale]/auth/connexion/page.tsx": ("../../../../lib/routes", [('canonicalPath: "/auth/connexion"', "canonicalPath: LOGIN_PATH", 1)]),
    "apps/client/src/components/account/account-settings-view.tsx": ("../../lib/routes", [(*JSX_CLIENT, 1)]),
    "apps/client/src/components/auth/auth-ui.tsx": ("../../lib/routes", [(*JSX_CLIENT, 1), (*PRO_URL, 1)]),
    "apps/client/src/components/auth/google-signin.tsx": ("../../lib/routes", [(*PRO_URL, 1)]),
    "apps/client/src/components/auth/recovery-forms.tsx": ("../../lib/routes", [(*JSX_CLIENT, 3)]),
    "apps/client/src/components/auth/register-form.tsx": ("../../lib/routes", [(*JSX_CLIENT, 1)]),
    "apps/client/src/components/auth/verify-email-view.tsx": ("../../lib/routes", [(*JSX_CLIENT, 1)]),
    "apps/client/src/components/site-chrome.tsx": ("../lib/routes", [(*JSX_CLIENT, 1)]),
    "apps/client/src/components/venue/visit-booking-panel.tsx": ("../../lib/routes", [(*JSX_CLIENT, 1)]),
    "apps/pro/src/App.tsx": ("./routes", [('path="/auth/connexion"', "path={LOGIN_PATH}", 1)]),
    "apps/pro/src/auth/auth-ui.tsx": ("../routes", [(*TO_PRO, 1)]),
    "apps/pro/src/auth/recovery-pages.tsx": ("../routes", [(*TO_PRO, 3), ('"/" : "/auth/connexion"', '"/" : LOGIN_PATH', 1)]),
    "apps/pro/src/auth/register-page.tsx": ("../routes", [(*TO_PRO, 2)]),
    "apps/pro/src/auth/require-pro.tsx": ("../routes", [(*TO_PRO, 1)]),
}

IMPORT_FIN = re.compile(r'^(?:import .* from |\} from )"[^"]+";$')
total = 0
for chemin, (module, remplacements) in PLAN.items():
    brut = io.open(chemin, encoding="utf-8", newline="").read()
    crlf = "\r\n" in brut
    s = brut.replace("\r\n", "\n")
    for ancre, nouveau, attendu in remplacements:
        vu = s.count(ancre)
        if vu != attendu:
            sys.exit(f"{chemin} : ancre « {ancre} » {vu} fois, {attendu} attendue(s) — RIEN N'EST ÉCRIT pour ce fichier et les suivants")
        s = s.replace(ancre, nouveau)
        total += attendu
    lignes = s.split("\n")
    fins = [i for i, l in enumerate(lignes[:80]) if IMPORT_FIN.match(l)]
    if not fins:
        sys.exit(f"{chemin} : aucune ligne d'import trouvée")
    if any("LOGIN_PATH" in l and "import" in l for l in lignes[: fins[-1] + 1]):
        sys.exit(f"{chemin} : LOGIN_PATH déjà importé")
    lignes.insert(fins[-1] + 1, f'import {{ LOGIN_PATH }} from "{module}";')
    s = "\n".join(lignes)
    io.open(chemin, "w", encoding="utf-8", newline="").write(s.replace("\n", "\r\n") if crlf else s)
    relu = io.open(chemin, encoding="utf-8", newline="").read()
    reste = relu.count('"/auth/connexion"') + relu.count("/auth/connexion`")
    print(f"{chemin} : {sum(n for *_, n in remplacements)} remplacement(s) · import ajouté · "
          f"« /auth/connexion » en code restant(s) {reste} · {'CRLF' if crlf else 'LF'} · "
          f"LF nus {relu.count(chr(10)) - relu.count(chr(13) + chr(10)) if crlf else 0}")
print(f"TOTAL : {total} remplacements (attendu 21)")
