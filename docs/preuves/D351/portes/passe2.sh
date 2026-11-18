#!/usr/bin/env bash
# D351 — SECONDE passe e2e (R-15 de D343, regle-portes.md § 4) : `pnpm test:e2e` seul, juste après la passe du pilote. Même relevé d'état machine que le pilote (copie de sa fonction `etat`), toutes les 30 s.
OUT="$1"
mkdir -p "$OUT"
cd "$(git rev-parse --show-toplevel)" || exit 2
etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}
AVANT="$(etat)"
{
  echo "D351 — SECONDE PASSE E2E — départ $(date '+%d/%m/%Y %H:%M:%S')"
  echo "SHA: $(git rev-parse HEAD)"
  echo "arbre (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "état machine JUSTE AVANT: $AVANT"
  echo "ports d'e2e occupés (3100 3101 5273 5274): [$(powershell.exe -NoProfile -Command '@(3100,3101,5273,5274) | ForEach-Object { if (Get-NetTCPConnection -LocalPort $_ -State Listen -EA 0) { $_ } }' | tr -d '\r' | tr '\n' ' ')]"
} > "$OUT/_index-passe-2.txt"
case "$AVANT" in *BATTERIE*) echo "REFUS : sur BATTERIE (R-9 de D340)" | tee -a "$OUT/_index-passe-2.txt"; echo "REFUS" > "$OUT/FIN-2"; exit 3;; esac
( while [ ! -f "$OUT/ARRET-2" ]; do etat >> "$OUT/etat-machine-passe-2.txt"; sleep 30; done ) &
ECH=$!
t0=$(date +%s)
pnpm test:e2e > "$OUT/test-e2e-passe-2.txt" 2>&1
code=$?
t1=$(date +%s)
{
  echo "test-e2e (passe 2) : code de sortie $code · durée $((t1 - t0)) s"
  echo "état machine JUSTE APRÈS: $(etat)"
  echo "arbre après la passe (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "fin $(date '+%d/%m/%Y %H:%M:%S')"
} >> "$OUT/_index-passe-2.txt"
touch "$OUT/ARRET-2"
wait $ECH 2>/dev/null
echo "PASSE 2 TERMINEE — code $code — échantillons sur BATTERIE : $(grep -c BATTERIE "$OUT/etat-machine-passe-2.txt") sur $(wc -l < "$OUT/etat-machine-passe-2.txt")" > "$OUT/FIN-2"
