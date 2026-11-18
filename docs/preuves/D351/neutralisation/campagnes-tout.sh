#!/usr/bin/env bash
# D351 — R-3 : `neutralisation/lancer-campagnes.py --tout`, EN SÉRIE, sur secteur, depuis la racine. Même relevé d'état machine que le pilote (copie de sa fonction `etat`), toutes les 30 s.
# Empreinte sha256 de CHAQUE harnais relevée AVANT et APRÈS : elles doivent être identiques (« harnais modifié en cours de campagne ⇒ campagne rejouée EN ENTIER »).
OUT="$1"
mkdir -p "$OUT"
cd "$(git rev-parse --show-toplevel)" || exit 2
etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}
AVANT="$(etat)"
{
  echo "D351 — CAMPAGNES (R-3) — lancer-campagnes.py --tout — départ $(date '+%d/%m/%Y %H:%M:%S')"
  echo "SHA: $(git rev-parse HEAD)"
  echo "arbre (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "stash: [$(git stash list | tr '\n' ';')]"
  echo "état machine JUSTE AVANT: $AVANT"
} > "$OUT/_index-campagnes.txt"
case "$AVANT" in *BATTERIE*) echo "REFUS : sur BATTERIE (R-9 de D340)" | tee -a "$OUT/_index-campagnes.txt"; echo "REFUS" > "$OUT/FIN-CAMPAGNES"; exit 3;; esac
[ -z "$(git status --short)" ] || { echo "REFUS : arbre sale" | tee -a "$OUT/_index-campagnes.txt"; echo "REFUS" > "$OUT/FIN-CAMPAGNES"; exit 3; }
sha256sum neutralisation/neutralize-*.py > "$OUT/harnais-avant.txt"
( while [ ! -f "$OUT/ARRET-CAMPAGNES" ]; do etat >> "$OUT/etat-machine-campagnes.txt"; sleep 30; done ) &
ECH=$!
t0=$(date +%s)
python3 neutralisation/lancer-campagnes.py --tout > "$OUT/lancer-campagnes-tout.txt" 2>&1
code=$?
t1=$(date +%s)
sha256sum neutralisation/neutralize-*.py > "$OUT/harnais-apres.txt"
mkdir -p "$OUT/journaux" && cp .neutralisation-journaux/*.log "$OUT/journaux/" 2>/dev/null
{
  echo "lancer-campagnes.py --tout : code de sortie $code · durée $((t1 - t0)) s"
  echo "harnais avant/après identiques : $(cmp -s "$OUT/harnais-avant.txt" "$OUT/harnais-apres.txt" && echo OUI || echo NON) ($(wc -l < "$OUT/harnais-avant.txt") empreintes)"
  echo "état machine JUSTE APRÈS: $(etat)"
  echo "arbre après (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "stash: [$(git stash list | tr '\n' ';')]"
  echo "fin $(date '+%d/%m/%Y %H:%M:%S')"
} >> "$OUT/_index-campagnes.txt"
touch "$OUT/ARRET-CAMPAGNES"
wait $ECH 2>/dev/null
echo "CAMPAGNES --tout TERMINEES — code $code — échantillons sur BATTERIE : $(grep -c BATTERIE "$OUT/etat-machine-campagnes.txt") sur $(wc -l < "$OUT/etat-machine-campagnes.txt")" > "$OUT/FIN-CAMPAGNES"
