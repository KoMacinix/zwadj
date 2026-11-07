#!/usr/bin/env bash
# D343 — lance la REPRODUCTION de D265 (ou sa garde) contre le VRAI serveur d'API, garde le brut HORS dépôt, verse une sortie FILTRÉE et les empreintes des fichiers joués.
# Pièce versée, jamais promue en instrument (D291).
#
# MODE D'EMPLOI : depuis la RACINE, `bash docs/preuves/D343/reproduction/lancer-repro.sh <nom> <cible> <dossier-brut-hors-depot>`
#   <nom>    : rouge-avant | vert-apres | correction-neutralisee  → écrit docs/preuves/D343/reproduction/<nom>.txt et <nom>-empreintes.txt
#   <cible>  : repro-d265 (la reproduction de ce dossier) | d265-socket-perimee (la garde permanente de la suite, après correction)
#   brut     : un dossier HORS du dépôt (D270 : rien ne s'écrit dans l'arbre pendant une vérification ; D200 : le brut porte des jetons de vérification)
#
# CE QUE LA SORTIE VERSÉE CONTIENT : l'en-tête (SHA, arbre, état machine avant/après, versions, empreinte et taille du brut, nombre de lignes de serveur retirées,
# nombre de démarrages de l'API), puis la sortie de Playwright SANS les lignes `[WebServer]` (les journaux du serveur, qui portent des jetons — D200).
# Les empreintes sha256 des fichiers JOUÉS entrent dans <nom>-empreintes.txt (D334, item 5) : le fichier de test que la sortie a joué est identifiable octet pour octet.
OUT_NOM="$1"; CIBLE="$2"; BRUT_DIR="$3"
[ -n "$OUT_NOM" ] && [ -n "$CIBLE" ] && [ -n "$BRUT_DIR" ] || { echo "usage: lancer-repro.sh <nom> <cible> <dossier-brut-hors-depot>"; exit 2; }
cd "$(git rev-parse --show-toplevel)" || exit 2
case "$BRUT_DIR" in "$(pwd)"*) echo "REFUS : le dossier du brut doit être HORS du dépôt"; exit 2;; esac
mkdir -p "$BRUT_DIR"
DOSSIER="docs/preuves/D343/reproduction"
BRUT="$BRUT_DIR/$OUT_NOM-brut.txt"

etat() {
  powershell.exe -NoProfile -Command '$b=(Get-CimInstance Win32_Battery).BatteryStatus; $o=Get-CimInstance Win32_OperatingSystem; "{0} | {1} | RAM libre {2:N0} Mo | chrome {3} | headless_shell {4} | node {5}" -f (Get-Date -Format "HH:mm:ss"), $(if($b -eq 2){"SECTEUR"}else{"BATTERIE"}), ($o.FreePhysicalMemory/1024), @(Get-Process chrome -EA 0).Count, @(Get-Process headless_shell -EA 0).Count, @(Get-Process node -EA 0).Count' | tr -d '\r'
}
PORT_API="${E2E_API_PORT:-3101}"
OCCUPE="$(powershell.exe -NoProfile -Command "if (Get-NetTCPConnection -LocalPort $PORT_API -State Listen -EA 0) { 'OUI' } else { 'NON' }" | tr -d '\r')"
[ "$OCCUPE" = "NON" ] || { echo "REFUS : le port $PORT_API est occupé — la reproduction mesurerait un autre serveur"; exit 3; }
docker ps --filter name=zwadj-db --filter status=running --format '{{.Names}}' | grep -q zwadj-db || { echo "REFUS : le conteneur zwadj-db n'est pas Up"; exit 3; }

AVANT="$(etat)"
SHA="$(git rev-parse HEAD)"
ARBRE="$(git status --short | tr '\n' ';')"

export D343_SORTIE_TEST="$BRUT_DIR/test-results-$OUT_NOM"
( cd e2e && pnpm exec playwright test --config "../$DOSSIER/repro.config.ts" "$CIBLE" ) > "$BRUT" 2>&1
CODE=$?
APRES="$(etat)"

SANS_ANSI="$(sed -E 's/\x1b\[[0-9;]*m//g' "$BRUT")"
N_SERVEUR="$(printf '%s\n' "$SANS_ANSI" | grep -c '^\[WebServer\]')"
N_DEMARRAGES="$(printf '%s\n' "$SANS_ANSI" | grep -c 'Nest application successfully started')"
N_CHANGEMENT="$(printf '%s\n' "$SANS_ANSI" | grep -c 'File change detected')"
FILTRE="$(printf '%s\n' "$SANS_ANSI" | grep -v '^\[WebServer\]')"
if printf '%s\n' "$FILTRE" | grep -q -E 'token=[A-Za-z0-9_-]{16,}'; then echo "ARRÊT : un jeton est resté dans la sortie filtrée — rien n'est versé"; exit 4; fi

{
  echo "D343 — $OUT_NOM — cible « $CIBLE » — $(date '+%d/%m/%Y %H:%M:%S')"
  echo "SHA: $SHA"
  echo "arbre (git status --short): [$ARBRE]"
  echo "état machine AVANT: $AVANT"
  echo "état machine APRÈS: $APRES"
  echo "node $(node --version) · playwright $(node -p "require('./e2e/node_modules/@playwright/test/package.json').version") · undici $(node -p "process.versions.undici")"
  echo "commande: cd e2e && pnpm exec playwright test --config ../$DOSSIER/repro.config.ts $CIBLE"
  echo "code de sortie de Playwright: $CODE"
  echo "brut (HORS dépôt): $(wc -c < "$BRUT") octets, sha256 $(sha256sum "$BRUT" | cut -d' ' -f1)"
  echo "lignes [WebServer] retirées de cette pièce (jetons, D200): $N_SERVEUR · « Nest application successfully started »: $N_DEMARRAGES (attendu 1) · « File change detected »: $N_CHANGEMENT (attendu 0)"
  echo "────────────────────────────────────────────────────────────────"
  printf '%s\n' "$FILTRE"
} > "$DOSSIER/$OUT_NOM.txt"

{
  echo "D343 — empreintes sha256 des fichiers JOUÉS par « $OUT_NOM » (D334, item 5) — relevées JUSTE APRÈS la passe, sur le disque, octet pour octet"
  for f in "$DOSSIER/repro.config.ts" "$DOSSIER/repro-d265.repro.ts" "$DOSSIER/lancer-repro.sh" e2e/fixtures/harness.ts e2e/playwright.config.ts e2e/global-setup.ts e2e/specs/d265-socket-perimee.e2e.ts; do
    if [ -f "$f" ]; then echo "$(sha256sum "$f" | cut -d' ' -f1)  $f"; else echo "(absent)  $f"; fi
  done
} > "$DOSSIER/$OUT_NOM-empreintes.txt"

echo "code de sortie de Playwright: $CODE"
exit $CODE
