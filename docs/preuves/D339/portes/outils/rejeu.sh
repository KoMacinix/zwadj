#!/bin/bash
# D339 — le REJEU UNIQUE de l'e2e de clôture (décision R-6 du relevé de Ko, 03/11/2026). À la main, `retries` inchangé (0), UNE fois.
# Sorties dans le scratchpad (hors dépôt) : le relevé ne touche aucun fichier suivi (R-8). Rien ne s'écrit dans le dépôt pendant l'e2e (D270).
S="/c/Users/benla/AppData/Local/Temp/claude/c--Users-benla-Desktop-MyProjct-Zwadj/0bd71a52-6912-427a-980c-dfbed86dc523/scratchpad"
R="$S/rejeu"
mkdir -p "$R"
cd /c/Users/benla/Desktop/MyProjct/Zwadj || exit 9
export NO_COLOR=1 FORCE_COLOR=0
PS="powershell.exe -NoProfile -ExecutionPolicy Bypass -File $(cygpath -w "$S/releve-machine.ps1")"
MACH="$(cygpath -w "$R/etat-machine-rejeu.txt")"
STOP="$(cygpath -w "$R/stop.flag")"
rm -f "$R"/etat-machine-rejeu.txt "$R"/stop.flag "$R"/test-e2e-rejeu-BRUT.txt "$R"/fin.txt

echo "HEAD au lancement : $(git rev-parse HEAD)" > "$R/lancement.txt"
echo "arbre (git status --short) :" >> "$R/lancement.txt"
git status --short | sed 's/^/   /' >> "$R/lancement.txt"

# 1. les .env : porte dure à l'ouverture (D330) — un hôte non local, ou une erreur : le rejeu NE DÉMARRE PAS
python3 docs/preuves/D330/outils/etat-env.py relever d339-rejeu-ouverture "$R" > "$R/env-ouverture-console.txt" 2>&1
CODE_ENV=$?
echo "etat-env ouverture : code $CODE_ENV" >> "$R/lancement.txt"
if [ $CODE_ENV -ne 0 ]; then echo "ARRÊT : état des .env à l'ouverture, code $CODE_ENV" ; cat "$R/env-ouverture-console.txt"; exit 11; fi

# 2. l'état machine JUSTE AVANT : sur batterie, ou chrome / headless_shell > 0 : le rejeu NE DÉMARRE PAS (D290, D331)
$PS -Etiquette AVANT -Sortie "$MACH"
CODE_AVANT=$?
echo "relevé AVANT : code $CODE_AVANT" >> "$R/lancement.txt"
if [ $CODE_AVANT -ne 0 ]; then echo "ARRÊT : état machine AVANT non conforme, code $CODE_AVANT"; exit 12; fi

# 3. l'échantillonneur, toutes les 30 s, en arrière-plan
$PS -Boucle -Pas 30 -Stop "$STOP" -Sortie "$MACH" &
PID_ECH=$!
sleep 2

# 4. LE REJEU — la commande de la porte, depuis la racine
T0=$(date +%s)
echo "DÉPART DU REJEU : $(date '+%Y-%m-%d %H:%M:%S')" >> "$R/lancement.txt"
pnpm test:e2e > "$R/test-e2e-rejeu-BRUT.txt" 2>&1
CODE=$?
T1=$(date +%s)
echo "FIN DU REJEU : $(date '+%Y-%m-%d %H:%M:%S') · code $CODE · $((T1 - T0)) s" >> "$R/lancement.txt"

# 5. l'échantillonneur s'arrête, puis le relevé JUSTE APRÈS
touch "$R/stop.flag"
wait $PID_ECH
$PS -Etiquette APRES -Sortie "$MACH"
CODE_APRES=$?
echo "relevé APRES : code $CODE_APRES" >> "$R/lancement.txt"

# 6. les .env à la clôture, comparés à l'ouverture
python3 docs/preuves/D330/outils/etat-env.py relever d339-rejeu-cloture "$R" > "$R/env-cloture-console.txt" 2>&1
echo "etat-env clôture : code $?" >> "$R/lancement.txt"
python3 docs/preuves/D330/outils/etat-env.py comparer "$R/etat-env-d339-rejeu-ouverture.txt" "$R/etat-env-d339-rejeu-cloture.txt" > "$R/env-comparaison.txt" 2>&1
echo "etat-env comparer : code $?" >> "$R/lancement.txt"

echo "HEAD à la fin : $(git rev-parse HEAD)" >> "$R/lancement.txt"
echo "$CODE" > "$R/fin.txt"
echo "REJEU TERMINÉ : code $CODE ($((T1 - T0)) s)"
exit $CODE
