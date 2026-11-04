#!/usr/bin/env bash
# D340 — LA PASSE SUR SECTEUR (R-8 de la note de Ko du 04/11/2026) : les six portes de la chaîne, EN SÉRIE, UNE fois, sans aucun rejeu.
# Sa règle est dans docs/preuves/D340/portes/regle-passe-secteur.md, écrite et commitée AVANT son lancement.
#
# MODE D'EMPLOI : depuis la RACINE, `bash docs/preuves/D340/portes/passe-secteur.sh <dossier-de-sortie>` — le dossier doit être HORS du dépôt (D270 : rien
# ne s'écrit dans l'arbre pendant une vérification). Ce script ne relance RIEN : une porte rouge reste rouge, la chaîne continue jusqu'au bout pour que la
# répartition des échecs soit complète, et c'est la règle qui dit quoi en faire.
#
# R-9 DE LA NOTE, APPLIQUÉE PAR LE PILOTE LUI-MÊME : « une session qui trouve le poste sur batterie au moment des portes de clôture ne les lance pas ».
# Sur batterie, ce script s'arrête AVANT la première porte (code 3) et l'écrit. Il refuse aussi de démarrer si le démon Docker ne répond pas, si le conteneur
# `zwadj-db` n'est pas « Up », si un port d'e2e est occupé ou si l'arbre n'est pas propre — mesurer sur un poste qui ne peut pas jouer la porte n'est pas mesurer.
# L'état machine est relevé juste AVANT, toutes les 30 s PENDANT (etat-machine-pendant.txt) et juste APRÈS (R-8).
OUT="$1"
[ -n "$OUT" ] || { echo "usage: passe-secteur.sh <dossier-de-sortie hors dépôt>"; exit 2; }
mkdir -p "$OUT"
cd "$(git rev-parse --show-toplevel)" || exit 2

etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}

AVANT="$(etat)"
{
  echo "D340 — PASSE SUR SECTEUR (R-8) — départ $(date '+%d/%m/%Y %H:%M:%S')"
  echo "SHA: $(git rev-parse HEAD)"
  echo "origin/main: $(git rev-parse origin/main)"
  echo "arbre (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "stash: [$(git stash list | tr '\n' ';')]"
  echo "état machine JUSTE AVANT: $AVANT"
  echo "docker: $(docker ps --filter name=zwadj-db --format '{{.Names}} {{.Status}}' 2>&1 | head -1)"
  echo "ports d'e2e occupés (3100 3101 5273 5274): [$(powershell.exe -NoProfile -Command '@(3100,3101,5273,5274) | ForEach-Object { if (Get-NetTCPConnection -LocalPort $_ -State Listen -EA 0) { $_ } }' | tr -d '\r' | tr '\n' ' ')]"
} > "$OUT/_index.txt"

refus() { echo "REFUS : $1" | tee -a "$OUT/_index.txt"; echo "REFUS : $1" > "$OUT/FIN"; exit 3; }
case "$AVANT" in *BATTERIE*) refus "le poste est sur BATTERIE — aucune porte n'est lancée (R-9)";; esac
docker info > /dev/null 2>&1 || refus "le démon Docker ne répond pas — aucune porte n'est lancée"
docker ps --filter name=zwadj-db --filter status=running --format '{{.Names}}' | grep -q zwadj-db || refus "le conteneur zwadj-db n'est pas Up — aucune porte n'est lancée"
[ -z "$(git status --short)" ] || refus "l'arbre n'est pas propre — aucune porte n'est lancée"
grep -q "ports d'e2e occupés (3100 3101 5273 5274): \[\]" "$OUT/_index.txt" || grep -q "ports d'e2e occupés (3100 3101 5273 5274): \[ *\]" "$OUT/_index.txt" || refus "un port d'e2e est occupé — aucune porte n'est lancée"

( while [ ! -f "$OUT/ARRET" ]; do etat >> "$OUT/etat-machine-pendant.txt"; sleep 30; done ) &
ECH=$!

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
  echo "état machine JUSTE APRÈS: $(etat)"
  echo "arbre après la passe (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "fin $(date '+%d/%m/%Y %H:%M:%S')"
} >> "$OUT/_index.txt"
touch "$OUT/ARRET"
wait $ECH 2>/dev/null
echo "PASSE TERMINEE — échantillons sur BATTERIE pendant la passe : $(grep -c BATTERIE "$OUT/etat-machine-pendant.txt") sur $(wc -l < "$OUT/etat-machine-pendant.txt")" | tee -a "$OUT/_index.txt" > "$OUT/FIN"
