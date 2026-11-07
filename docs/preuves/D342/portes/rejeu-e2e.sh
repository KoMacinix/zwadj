#!/usr/bin/env bash
# D342 — REJEU UNIQUE de l'e2e (`pnpm test:e2e`), EN ENTIER, UNE fois, à la main. Sa règle est dans docs/preuves/D342/portes/regle-rejeu.md, écrite et commitée AVANT son lancement
# (R-6 de D339, citée par la consigne du rang 45, § 3). COPIE ADAPTÉE de docs/preuves/D340/portes/rejeu-portes.sh (archivée comme PREUVE, jamais promue en instrument — D291) : seule la commande change
# (l'e2e seule, pas `pnpm test`) ; les portes dures de D339 (état machine AVANT, `.env`) y sont ajoutées, comme dans docs/preuves/D339/portes/outils/rejeu.sh.
#
# MODE D'EMPLOI : depuis la RACINE, `bash docs/preuves/D342/portes/rejeu-e2e.sh <dossier-de-sortie>` — le dossier doit être HORS du dépôt (D270 : rien ne s'écrit dans l'arbre pendant une
# vérification). `retries` de l'e2e reste à 0 : ce script ne le touche pas et ne relance RIEN. L'état machine est relevé juste AVANT, toutes les 30 s PENDANT, et juste APRÈS (R-8 de D339).
# PORTES DURES (le rejeu NE DÉMARRE PAS, code 3, et le dit) : poste sur BATTERIE (R-9 de D340) ; `chrome` ou `headless_shell` > 0 avant (D290, D331) ; Docker ou `zwadj-db` absents ; un port d'e2e
# occupé ; l'arbre n'est pas propre ; les `.env` : un hôte non local à l'ouverture, ou une erreur du relevé (docs/preuves/D330/outils/etat-env.py).
OUT="$1"
[ -n "$OUT" ] || { echo "usage: rejeu-e2e.sh <dossier-de-sortie hors dépôt>"; exit 2; }
mkdir -p "$OUT"
cd "$(git rev-parse --show-toplevel)" || exit 2
export NO_COLOR=1 FORCE_COLOR=0

etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}

AVANT="$(etat)"
{
  echo "D342 — REJEU UNIQUE de l'e2e — départ $(date '+%d/%m/%Y %H:%M:%S')"
  echo "SHA: $(git rev-parse HEAD)"
  echo "arbre (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "stash: [$(git stash list | tr '\n' ';')]"
  echo "état machine JUSTE AVANT: $AVANT"
  echo "docker: $(docker ps --filter name=zwadj-db --format '{{.Names}} {{.Status}}' 2>&1 | head -1)"
  echo "ports d'e2e occupés (3100 3101 5273 5274): [$(powershell.exe -NoProfile -Command '@(3100,3101,5273,5274) | ForEach-Object { if (Get-NetTCPConnection -LocalPort $_ -State Listen -EA 0) { $_ } }' | tr -d '\r' | tr '\n' ' ')]"
} > "$OUT/rejeu-index.txt"

refus() { echo "REFUS : $1" | tee -a "$OUT/rejeu-index.txt"; echo "REFUS : $1" > "$OUT/FIN"; exit 3; }
case "$AVANT" in *BATTERIE*) refus "le poste est sur BATTERIE — le rejeu ne démarre pas (R-9 de D340)";; esac
echo "$AVANT" | grep -q "chrome 0 | headless_shell 0" || refus "chrome ou headless_shell > 0 avant le rejeu — il ne démarre pas (D290, D331)"
docker info > /dev/null 2>&1 || refus "le démon Docker ne répond pas — le rejeu ne démarre pas"
docker ps --filter name=zwadj-db --filter status=running --format '{{.Names}}' | grep -q zwadj-db || refus "le conteneur zwadj-db n'est pas Up — le rejeu ne démarre pas"
[ -z "$(git status --short)" ] || refus "l'arbre n'est pas propre — le rejeu ne démarre pas"
grep -q "ports d'e2e occupés (3100 3101 5273 5274): \[ *\]" "$OUT/rejeu-index.txt" || refus "un port d'e2e est occupé — le rejeu ne démarre pas"
python3 -I docs/preuves/D330/outils/etat-env.py relever d342-rejeu-ouverture "$OUT" > "$OUT/rejeu-env-ouverture-console.txt" 2>&1 || refus "l'état des .env à l'ouverture n'est pas conforme (un hôte non local, ou une erreur du relevé) — le rejeu ne démarre pas"

( while [ ! -f "$OUT/ARRET" ]; do etat >> "$OUT/rejeu-etat-machine.txt"; sleep 30; done ) &
ECH=$!

echo "=== test-e2e — départ $(date +%H:%M:%S) — $(etat)" >> "$OUT/rejeu-index.txt"
T0=$(date +%s)
pnpm test:e2e > "$OUT/rejeu-test-e2e-BRUT.txt" 2>&1
CODE=$?
T1=$(date +%s)
echo "    test-e2e : code de sortie $CODE · durée $((T1 - T0)) s · fin $(date +%H:%M:%S) — $(etat)" >> "$OUT/rejeu-index.txt"

{
  echo "état machine JUSTE APRÈS: $(etat)"
  echo "arbre après le rejeu (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "fin $(date '+%d/%m/%Y %H:%M:%S')"
} >> "$OUT/rejeu-index.txt"
python3 -I docs/preuves/D330/outils/etat-env.py relever d342-rejeu-cloture "$OUT" > "$OUT/rejeu-env-cloture-console.txt" 2>&1
python3 -I docs/preuves/D330/outils/etat-env.py comparer "$OUT/etat-env-d342-rejeu-ouverture.txt" "$OUT/etat-env-d342-rejeu-cloture.txt" > "$OUT/rejeu-env-comparaison.txt" 2>&1
echo "etat-env comparer : code $?" >> "$OUT/rejeu-index.txt"
touch "$OUT/ARRET"
wait $ECH 2>/dev/null
echo "REJEU TERMINE — code $CODE — échantillons sur BATTERIE pendant le rejeu : $(grep -c BATTERIE "$OUT/rejeu-etat-machine.txt") sur $(wc -l < "$OUT/rejeu-etat-machine.txt")" | tee -a "$OUT/rejeu-index.txt" > "$OUT/FIN"
exit $CODE
