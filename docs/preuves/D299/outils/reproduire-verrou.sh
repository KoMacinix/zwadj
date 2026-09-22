#!/usr/bin/env bash
# REPRODUCTION DE LA CAUSE DU TROU DE L'ÉCHANTILLONNEUR (D299, passe 1) — procédure archivée comme preuve.
# Usage, depuis la racine : bash docs/preuves/D299/outils/reproduire-verrou.sh <fichier témoin HORS dépôt>
# Deux bras, sur un fichier témoin, jamais sur un journal de mesure :
#   bras 1 — un `tail -f` (Git Bash) tient le fichier : `Add-Content` (PowerShell, l'écriture de
#            `echantillonneur-etat-machine.ps1`, l. 184) doit être REFUSÉ (IOException) ;
#   bras 2 — le `tail` arrêté : `Add-Content` doit ÉCRIRE.
# Si les deux bras ne rendent pas ces verdicts, la cause attribuée au trou n'est pas établie.
T="$1"
echo "entete" > "$T"
(tail -n 0 -f "$T" > /dev/null &)
sleep 2
powershell -NoProfile -Command "try { Add-Content -Path '$T' -Value 'ligne1' -Encoding utf8 -ErrorAction Stop; 'bras 1 (tail actif) : ECRIT' } catch { 'bras 1 (tail actif) : REFUSE - ' + \$_.Exception.GetType().Name }" < /dev/null
pid=$(powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \"Name='tail.exe'\" | Where-Object { \$_.CommandLine -like '*$(basename "$T")*' }).ProcessId" < /dev/null | tr -d '\r')
taskkill //PID "$pid" //F > /dev/null 2>&1
sleep 1
powershell -NoProfile -Command "try { Add-Content -Path '$T' -Value 'ligne2' -Encoding utf8 -ErrorAction Stop; 'bras 2 (tail arrete) : ECRIT' } catch { 'bras 2 (tail arrete) : REFUSE - ' + \$_.Exception.GetType().Name }" < /dev/null
echo "--- contenu du témoin (attendu : entete, ligne2)"
cat "$T"
echo "--- tail restants sur le témoin : $(powershell -NoProfile -Command "@(Get-CimInstance Win32_Process -Filter \"Name='tail.exe'\" | Where-Object { \$_.CommandLine -like '*$(basename "$T")*' }).Count" < /dev/null | tr -d '\r') (attendu 0)"
