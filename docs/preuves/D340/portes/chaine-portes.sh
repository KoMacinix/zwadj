#!/usr/bin/env bash
# Chaîne des portes de D340 (rang 44) : typecheck, lint, test, build, test:int, test:e2e — EN SÉRIE, depuis la racine.
# Sorties brutes dans $OUT (HORS du dépôt : D270, rien ne s'écrit dans l'arbre pendant une vérification) ; versées ensuite, masquées si besoin.
# L'état machine est relevé AVANT et APRÈS chaque porte, et toutes les 60 s PENDANT toute la chaîne.
OUT="$1"
mkdir -p "$OUT"
cd /c/Users/benla/Desktop/MyProjct/Zwadj || exit 2

etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}

# échantillonneur : une ligne par minute, jusqu'à la présence du fichier d'arrêt
( while [ ! -f "$OUT/ARRET" ]; do etat >> "$OUT/etat-machine-pendant.txt"; sleep 60; done ) &
ECH=$!

{
  echo "D340 — chaîne des portes — départ $(date '+%d/%m/%Y %H:%M:%S')"
  echo "SHA: $(git rev-parse HEAD)"
  echo "origin/main: $(git rev-parse origin/main)"
  echo "arbre (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "stash: [$(git stash list | tr '\n' ';')]"
  echo "état machine à l'OUVERTURE: $(etat)"
} > "$OUT/_index.txt"

porte() {
  local nom="$1"; shift
  echo "=== $nom — départ $(date +%H:%M:%S) — $(etat)" >> "$OUT/_index.txt"
  local t0=$(date +%s)
  "$@" > "$OUT/$nom.txt" 2>&1
  local code=$?
  local t1=$(date +%s)
  echo "    $nom : code de sortie $code · durée $((t1 - t0)) s · fin $(date +%H:%M:%S) — $(etat)" >> "$OUT/_index.txt"
}

porte typecheck pnpm typecheck
porte lint pnpm lint
porte test pnpm test
porte build pnpm build
porte test-int pnpm test:int
porte test-e2e pnpm test:e2e

{
  echo "état machine à la CLÔTURE: $(etat)"
  echo "arbre après les portes (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "fin $(date '+%d/%m/%Y %H:%M:%S')"
} >> "$OUT/_index.txt"
touch "$OUT/ARRET"
wait $ECH 2>/dev/null
echo "CHAINE TERMINEE" > "$OUT/FIN"
