#!/usr/bin/env bash
# D351 — R-3 (suite) : les campagnes que la fusion touche et dont des cibles sont d'un mode `--int` ou `--e2e`, jouées EN SÉRIE (jamais en parallèle : chacune MUTE des fichiers sources et prend les ports de l'e2e).
# Avant chaque campagne : arbre propre, sans stash, ports d'e2e libres, empreinte du harnais ; après chacune : arbre propre (sinon on ARRÊTE la série), même empreinte.
OUT="$1"
mkdir -p "$OUT"
cd "$(git rev-parse --show-toplevel)" || exit 2
etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}
AVANT="$(etat)"
echo "D351 — CAMPAGNES À MODE — départ $(date '+%d/%m/%Y %H:%M:%S') — SHA $(git rev-parse HEAD) — état: $AVANT" > "$OUT/_index-modes.txt"
case "$AVANT" in *BATTERIE*) echo "REFUS : sur BATTERIE (R-9 de D340)" | tee -a "$OUT/_index-modes.txt"; echo REFUS > "$OUT/FIN-MODES"; exit 3;; esac
( while [ ! -f "$OUT/ARRET-MODES" ]; do etat >> "$OUT/etat-machine-modes.txt"; sleep 30; done ) &
ECH=$!
SERIE="ca1:--int ca6:--e2e fc1:--e2e fc2:--e2e fc8:--e2e r48:--e2e pub1:--e2e"
for item in $SERIE; do
  n="${item%%:*}"; flag="${item##*:}"; script="neutralisation/neutralize-$n.py"
  if [ -n "$(git status --short)" ] || [ -n "$(git stash list)" ]; then echo "ARRÊT : arbre sale ou stash avant $n : [$(git status --short | tr '\n' ';')]" | tee -a "$OUT/_index-modes.txt"; break; fi
  if powershell.exe -NoProfile -Command '@(3100,3101,5273,5274) | ForEach-Object { if (Get-NetTCPConnection -LocalPort $_ -State Listen -EA 0) { $_ } }' | tr -d '\r' | grep -q .; then echo "ARRÊT : un port d'e2e est occupé avant $n" | tee -a "$OUT/_index-modes.txt"; break; fi
  h1="$(sha256sum $script | cut -c1-64)"
  t0=$(date +%s)
  echo "=== $n $flag — départ $(date +%H:%M:%S) — harnais sha256 $h1" >> "$OUT/_index-modes.txt"
  python3 $script $flag > "$OUT/neutralize-$n$flag.txt" 2>&1
  code=$?
  t1=$(date +%s)
  h2="$(sha256sum $script | cut -c1-64)"
  echo "    $n $flag : code de sortie $code · durée $((t1 - t0)) s · harnais identique après : $([ "$h1" = "$h2" ] && echo OUI || echo NON) · arbre après : [$(git status --short | tr '\n' ';')]" >> "$OUT/_index-modes.txt"
done
echo "état machine JUSTE APRÈS: $(etat)" >> "$OUT/_index-modes.txt"
touch "$OUT/ARRET-MODES"
wait $ECH 2>/dev/null
echo "CAMPAGNES À MODE TERMINEES — échantillons sur BATTERIE : $(grep -c BATTERIE "$OUT/etat-machine-modes.txt") sur $(wc -l < "$OUT/etat-machine-modes.txt")" > "$OUT/FIN-MODES"
