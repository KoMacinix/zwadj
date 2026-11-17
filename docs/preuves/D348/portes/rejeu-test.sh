#!/usr/bin/env bash
# D348 (suite) — REJEU UNIQUE de la porte `pnpm test`, EN ENTIER, UNE fois (R-1 de la consigne « RANG 50 (SUITE) », adoptée par Ko le 16/11/2026).
# COPIE de docs/preuves/D340/portes/rejeu-portes.sh (non modifié), avec DEUX écarts déclarés :
#   1. seule la porte `test` est rejouée (l'original rejoue `test` puis `test:e2e`) ;
#   2. un REFUS sur batterie, avant la porte (R-9 de D340, que l'original n'avait pas), et un refus si l'arbre n'est pas propre.
# Règle : docs/preuves/D348/portes/regle-rejeu.md, écrite et commitée AVANT le lancement.
# MODE D'EMPLOI : depuis la RACINE, `bash docs/preuves/D348/portes/rejeu-test.sh <dossier-de-sortie>` — le dossier doit être HORS du dépôt (D270).
# Ce script ne relance RIEN. Procédure archivée comme pièce, jamais promue en instrument (D291).
OUT="$1"
[ -n "$OUT" ] || { echo "usage: rejeu-test.sh <dossier-de-sortie hors dépôt>"; exit 2; }
mkdir -p "$OUT"
cd "$(git rev-parse --show-toplevel)" || exit 2

etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}

AVANT="$(etat)"
{
  echo "D348 (suite) — REJEU UNIQUE de pnpm test — départ $(date '+%d/%m/%Y %H:%M:%S')"
  echo "SHA: $(git rev-parse HEAD)"
  echo "origin/main: $(git rev-parse origin/main)"
  echo "arbre (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "état machine JUSTE AVANT: $AVANT"
} > "$OUT/rejeu-index.txt"

refus() { echo "REFUS : $1" | tee -a "$OUT/rejeu-index.txt"; echo "REFUS : $1" > "$OUT/FIN"; exit 3; }
case "$AVANT" in *BATTERIE*) refus "le poste est sur BATTERIE — la porte n'est pas lancée (R-9)";; esac
[ -z "$(git status --short)" ] || refus "l'arbre n'est pas propre — la porte n'est pas lancée"

( while [ ! -f "$OUT/ARRET" ]; do etat >> "$OUT/rejeu-etat-machine.txt"; sleep 30; done ) &
ECH=$!

echo "=== test — départ $(date +%H:%M:%S) — $(etat)" >> "$OUT/rejeu-index.txt"
t0=$(date +%s)
pnpm test > "$OUT/rejeu-test.txt" 2>&1
code=$?
t1=$(date +%s)
echo "    test : code de sortie $code · durée $((t1 - t0)) s · fin $(date +%H:%M:%S) — $(etat)" >> "$OUT/rejeu-index.txt"

{
  echo "état machine JUSTE APRÈS: $(etat)"
  echo "arbre après le rejeu (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "fin $(date '+%d/%m/%Y %H:%M:%S')"
} >> "$OUT/rejeu-index.txt"
touch "$OUT/ARRET"
wait $ECH 2>/dev/null
echo "REJEU TERMINE — échantillons sur BATTERIE pendant la passe : $(grep -c BATTERIE "$OUT/rejeu-etat-machine.txt") sur $(wc -l < "$OUT/rejeu-etat-machine.txt")" > "$OUT/FIN"
