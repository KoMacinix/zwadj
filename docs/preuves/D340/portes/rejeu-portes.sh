#!/usr/bin/env bash
# D340 — REJEU UNIQUE des deux portes rouges de la première passe : `pnpm test` PUIS `pnpm test:e2e`, EN ENTIER, UNE fois, à la main.
# La règle de ce rejeu est dans docs/preuves/D340/portes/arret-portes.md, écrite et commitée AVANT son lancement (R-6 de D339, consigne du rang 44 section 2).
#
# MODE D'EMPLOI : depuis la RACINE, `bash docs/preuves/D340/portes/rejeu-portes.sh <dossier-de-sortie>` — le dossier doit être HORS du dépôt (D270 : rien ne
# s'écrit dans l'arbre pendant une vérification). `retries` de l'e2e reste à 0 : ce script ne le touche pas et ne relance RIEN.
# L'état machine est relevé juste AVANT, toutes les 30 s PENDANT (fichier rejeu-etat-machine.txt), et juste APRÈS (R-8 de D339).
OUT="$1"
[ -n "$OUT" ] || { echo "usage: rejeu-portes.sh <dossier-de-sortie hors dépôt>"; exit 2; }
mkdir -p "$OUT"
cd "$(git rev-parse --show-toplevel)" || exit 2

etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}

( while [ ! -f "$OUT/ARRET" ]; do etat >> "$OUT/rejeu-etat-machine.txt"; sleep 30; done ) &
ECH=$!

{
  echo "D340 — REJEU UNIQUE — départ $(date '+%d/%m/%Y %H:%M:%S')"
  echo "SHA: $(git rev-parse HEAD)"
  echo "arbre (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "ports d'e2e occupés avant le lancement (3100 3101 5273 5274): [$(powershell.exe -NoProfile -Command '@(3100,3101,5273,5274) | ForEach-Object { if (Get-NetTCPConnection -LocalPort $_ -State Listen -EA 0) { $_ } }' | tr -d '\r' | tr '\n' ' ')]"
  echo "état machine JUSTE AVANT: $(etat)"
} > "$OUT/rejeu-index.txt"

rejeu() {
  local nom="$1"; shift
  echo "=== $nom — départ $(date +%H:%M:%S) — $(etat)" >> "$OUT/rejeu-index.txt"
  local t0=$(date +%s)
  "$@" > "$OUT/$nom.txt" 2>&1
  local code=$?
  local t1=$(date +%s)
  echo "    $nom : code de sortie $code · durée $((t1 - t0)) s · fin $(date +%H:%M:%S) — $(etat)" >> "$OUT/rejeu-index.txt"
}

rejeu test-rejeu-1 pnpm test
rejeu test-e2e-rejeu pnpm test:e2e

{
  echo "état machine JUSTE APRÈS: $(etat)"
  echo "arbre après le rejeu (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "fin $(date '+%d/%m/%Y %H:%M:%S')"
} >> "$OUT/rejeu-index.txt"
touch "$OUT/ARRET"
wait $ECH 2>/dev/null
echo "REJEU TERMINE" > "$OUT/FIN"
