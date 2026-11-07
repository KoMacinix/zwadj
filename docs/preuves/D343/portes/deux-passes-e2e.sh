#!/usr/bin/env bash
# D343 — LES DEUX PASSES de l'e2e (R-15 de la consigne du rang 45 (suite)), EN ENTIER, DEUX fois de suite, SUR SECTEUR. Sa règle est dans
# docs/preuves/D343/portes/regle-deux-passes.md, écrite et commitée AVANT leur lancement. COPIE ADAPTÉE de docs/preuves/D342/portes/rejeu-e2e.sh (archivée comme PREUVE,
# jamais promue en instrument — D291) : la commande est la même (`pnpm test:e2e`), mais elle est jouée DEUX fois, et le script ARRÊTE la chaîne à la première passe rouge.
#
# MODE D'EMPLOI : depuis la RACINE, `bash docs/preuves/D343/portes/deux-passes-e2e.sh <dossier-de-sortie>` — le dossier doit être HORS du dépôt (D270 : rien ne s'écrit dans l'arbre
# pendant une vérification). `retries` de l'e2e reste à 0 : ce script ne le touche pas. Aucun rejeu, aucune troisième passe : un rouge arrête.
# PORTES DURES, vérifiées AVANT CHAQUE PASSE (si l'une est rouge, la passe ne démarre pas, code 3, et le script le dit) : poste sur BATTERIE (R-9 de D340) ; `chrome` ou `headless_shell` > 0
# (D290, D331) ; Docker ou `zwadj-db` absents ; un port d'e2e (3100, 3101, 5273, 5274) occupé ; l'arbre n'est pas propre ; et, avant la PREMIÈRE passe, l'état des `.env` (un hôte non local, ou
# une erreur du relevé : docs/preuves/D330/outils/etat-env.py). Après la dernière passe : les `.env` sont comparés à ceux de l'ouverture (une empreinte qui diffère refuse la marque).
# L'ATTENDU EST DÉRIVÉ, PAS ÉCRIT : le nombre de tests listés par `playwright test --list` est relevé AVANT la première passe et imprimé à côté du mesuré (D290, D275).
OUT="$1"
[ -n "$OUT" ] || { echo "usage: deux-passes-e2e.sh <dossier-de-sortie hors dépôt>"; exit 2; }
mkdir -p "$OUT"
cd "$(git rev-parse --show-toplevel)" || exit 2
case "$OUT" in "$(pwd)"*) echo "REFUS : le dossier de sortie doit être HORS du dépôt (D270)"; exit 2;; esac
export NO_COLOR=1 FORCE_COLOR=0

etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}
refus() { echo "REFUS : $1" | tee -a "$OUT/deux-passes-index.txt"; echo "REFUS : $1" > "$OUT/FIN"; exit 3; }

portes_dures() {  # $1 = numéro de la passe
  local AVANT; AVANT="$(etat)"
  echo "passe $1 — état machine JUSTE AVANT: $AVANT" >> "$OUT/deux-passes-index.txt"
  case "$AVANT" in *BATTERIE*) refus "passe $1 : le poste est sur BATTERIE — elle ne démarre pas (R-9 de D340)";; esac
  echo "$AVANT" | grep -q "chrome 0 | headless_shell 0" || refus "passe $1 : chrome ou headless_shell > 0 avant — elle ne démarre pas (D290, D331)"
  docker info > /dev/null 2>&1 || refus "passe $1 : le démon Docker ne répond pas — elle ne démarre pas"
  docker ps --filter name=zwadj-db --filter status=running --format '{{.Names}}' | grep -q zwadj-db || refus "passe $1 : le conteneur zwadj-db n'est pas Up — elle ne démarre pas"
  [ -z "$(git status --short)" ] || refus "passe $1 : l'arbre n'est pas propre — elle ne démarre pas"
  local OCCUPES; OCCUPES="$(powershell.exe -NoProfile -Command '@(3100,3101,5273,5274) | ForEach-Object { if (Get-NetTCPConnection -LocalPort $_ -State Listen -EA 0) { $_ } }' | tr -d '\r' | tr '\n' ' ')"
  echo "passe $1 — ports d'e2e occupés (3100 3101 5273 5274): [$OCCUPES]" >> "$OUT/deux-passes-index.txt"
  [ -z "$(echo "$OCCUPES" | tr -d ' ')" ] || refus "passe $1 : un port d'e2e est occupé — elle ne démarre pas"
}

{
  echo "D343 — LES DEUX PASSES de l'e2e — départ $(date '+%d/%m/%Y %H:%M:%S')"
  echo "SHA: $(git rev-parse HEAD)"
  echo "arbre (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "stash: [$(git stash list | tr '\n' ';')]"
  echo "docker: $(docker ps --filter name=zwadj-db --format '{{.Names}} {{.Status}}' 2>&1 | head -1)"
  echo "tests listés par 'playwright test --list' (l'ATTENDU, dérivé avant la première passe): $(cd e2e && pnpm exec playwright test --list 2>/dev/null | tail -1)"
} > "$OUT/deux-passes-index.txt"

portes_dures 1
python3 -I docs/preuves/D330/outils/etat-env.py relever d343-ouverture "$OUT" > "$OUT/env-ouverture-console.txt" 2>&1 || refus "l'état des .env à l'ouverture n'est pas conforme (un hôte non local, ou une erreur du relevé) — la passe 1 ne démarre pas"

( while [ ! -f "$OUT/ARRET" ]; do etat >> "$OUT/deux-passes-etat-machine.txt"; sleep 30; done ) &
ECH=$!

CODE_GLOBAL=0
for N in 1 2; do
  if [ "$N" = "2" ]; then portes_dures 2; fi
  echo "=== passe $N — départ $(date +%H:%M:%S) — $(etat)" >> "$OUT/deux-passes-index.txt"
  T0=$(date +%s)
  pnpm test:e2e > "$OUT/passe-$N-test-e2e-BRUT.txt" 2>&1
  CODE=$?
  T1=$(date +%s)
  echo "    passe $N : code de sortie $CODE · durée $((T1 - T0)) s · fin $(date +%H:%M:%S) — $(etat)" >> "$OUT/deux-passes-index.txt"
  echo "    passe $N — résumé de Playwright (lu dans le BRUT, codes ANSI retirés): $(sed -E 's/\x1b\[[0-9;]*m//g' "$OUT/passe-$N-test-e2e-BRUT.txt" | grep -E '^\s+[0-9]+ (passed|failed|skipped|flaky|did not run)' | tr -s ' ' | tr '\n' ';')" >> "$OUT/deux-passes-index.txt"
  if [ "$CODE" != "0" ]; then
    CODE_GLOBAL=$CODE
    echo "ARRÊT : la passe $N est ROUGE (code $CODE) — la règle interdit toute passe de plus (R-15 : un seul rouge ⇒ arrêt, pas de poussée)" | tee -a "$OUT/deux-passes-index.txt"
    break
  fi
done

{
  echo "état machine JUSTE APRÈS: $(etat)"
  echo "arbre après les passes (git status --short): [$(git status --short | tr '\n' ';')]"
  echo "fin $(date '+%d/%m/%Y %H:%M:%S')"
} >> "$OUT/deux-passes-index.txt"
python3 -I docs/preuves/D330/outils/etat-env.py relever d343-cloture "$OUT" > "$OUT/env-cloture-console.txt" 2>&1
python3 -I docs/preuves/D330/outils/etat-env.py comparer "$OUT/etat-env-d343-ouverture.txt" "$OUT/etat-env-d343-cloture.txt" > "$OUT/env-comparaison.txt" 2>&1
echo "etat-env comparer : code $?" >> "$OUT/deux-passes-index.txt"
touch "$OUT/ARRET"
wait $ECH 2>/dev/null
echo "DEUX PASSES TERMINÉES — code global $CODE_GLOBAL — échantillons sur BATTERIE pendant les passes : $(grep -c BATTERIE "$OUT/deux-passes-etat-machine.txt") sur $(wc -l < "$OUT/deux-passes-etat-machine.txt")" | tee -a "$OUT/deux-passes-index.txt" > "$OUT/FIN"
exit $CODE_GLOBAL
