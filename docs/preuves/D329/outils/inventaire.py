"""D329 — RELEVÉ des processus de navigateur et de `node` : `chrome` ET `headless_shell` (ajout (a) du relecteur, 12/10/2026). NOUVEAU SCRIPT, même commande PowerShell que la fonction `inventaire` de
`docs/preuves/D329/outils/passe.py` (copie du texte, comptée : une commande, six noms). C'est un RELEVÉ, pas une porte : il n'arrête rien et sort toujours en 0 si PowerShell a répondu.
MOTIF (mesuré à D326) : le navigateur du PDF est `headless_shell.exe` ; `Get-Process chrome` en compte zéro. La porte `chrome` = 0 de la sonde de l'état machine ne voit donc pas la fuite d'un rendu de PDF.
Calibration à deux bras, avant de servir : (positif) un processus `powershell` existe et est compté (le script en est un) ; (négatif) un nom forgé (`zwadj-processus-inexistant`) rend 0.
Usage, depuis la racine : python docs/preuves/D329/outils/inventaire.py <nom du relevé>  → écrit sur la sortie standard (à rediriger par bash, jamais par PowerShell 5.1 : UTF-16, D298).
"""
import re
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")
nom = sys.argv[1] if len(sys.argv) > 1 else "sans-nom"


def relever(noms: list) -> tuple:
    cmd = ("[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false; "
           "$noms = " + ",".join(f"'{n}'" for n in noms) + "; "
           "foreach ($n in $noms) { $p = @(Get-Process -Name $n -ErrorAction SilentlyContinue); "
           "Write-Output ('COMPTE ' + $n + '=' + $p.Count); "
           "foreach ($x in $p) { Write-Output ('  ' + $n + ' PID ' + $x.Id + ' début ' + $x.StartTime.ToString('yyyy-MM-dd HH:mm:ss') + ' mémoire_Mo ' + [math]::Round($x.WorkingSet64 / 1MB, 1)) } }")
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd], capture_output=True)
    t = r.stdout.decode("utf-8", errors="replace") + r.stderr.decode("utf-8", errors="replace")
    return t, dict(re.findall(r"^COMPTE (\S+)=(\d+)", t, re.M)), r.returncode


t0, c0, code0 = relever(["powershell", "zwadj-processus-inexistant"])
cal_pos = int(c0.get("powershell", "0")) >= 1
cal_neg = c0.get("zwadj-processus-inexistant") == "0"
print(f"calibration : positif (powershell compté ≥ 1) {'✓' if cal_pos else '✗'} · négatif (nom forgé = 0) {'✓' if cal_neg else '✗'}")
if not (cal_pos and cal_neg):
    sys.exit("✗ ABANDON : calibration manquée")
texte, comptes, code = relever(["chrome", "headless_shell", "chromium", "chrome_crashpad_handler", "node", "msedge"])
print(f"HORODATAGE {time.strftime('%d/%m/%Y %H:%M:%S')} · relevé « {nom} » · code {code}")
print(texte, end="")
print(f"RÉSUMÉ chrome={comptes.get('chrome')} headless_shell={comptes.get('headless_shell')} chromium={comptes.get('chromium')} node={comptes.get('node')} msedge={comptes.get('msedge')} "
      f"(noms parcourus : {len(comptes)}, attendu 6) — relevé, pas une porte")
sys.exit(0 if code == 0 and len(comptes) == 6 else 2)
