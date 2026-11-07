#!/usr/bin/env bash
# PILOTE DES PORTES — session `front-client` (né avec FC-1, servi aux lots suivants). Une PIÈCE versée qui sert d'outil :
# il ne juge rien, il lance et il relève.
#
# Usage, depuis la RACINE du monorepo :
#   bash docs/preuves/front-client/outils/portes.sh <dossier de sortie> <pont navigateur>
#     <dossier de sortie> : par ex. docs/preuves/front-client/FC-2/portes
#     <pont navigateur>   : le PLAYWRIGHT_BROWSERS_PATH hors dépôt décrit dans docs/preuves/front-client/etat-entree.md
#
# Ce qu'il fait, dans l'ordre de CLAUDE.md : typecheck, lint, test, build, test:int, test:e2e. Une porte à la fois (jamais en
# parallèle : test:int et e2e partagent la machine). Pour CHAQUE porte : le code de sortie de la COMMANDE (jamais celui d'une
# enveloppe, AGENTS.md), sa durée, son journal sans codes ANSI. Le journal brut de l'e2e reste HORS DÉPÔT (ses lignes
# `[WebServer]` portent des jetons de vérification d'e-mail) : le dossier de sortie en reçoit une copie SANS ces lignes, avec
# l'empreinte sha256 du brut et le compte des « token= » restants (attendu 0).
# Il ne s'arrête PAS au premier rouge : chaque porte est relevée, le jugement se fait à la lecture de `resume.txt`.
set -u
SORTIE="${1:?dossier de sortie}"
PONT="${2:?pont navigateur (PLAYWRIGHT_BROWSERS_PATH)}"
[ -f pnpm-workspace.yaml ] || { echo "✗ À LANCER DEPUIS LA RACINE DU MONOREPO"; exit 2; }
mkdir -p "$SORTIE"
BRUT="$(mktemp -d)"
: > "$SORTIE/resume.txt"
echo "# HEAD $(git rev-parse HEAD) · arbre : $(git status --porcelain | wc -l) entrée(s) non commitée(s) · $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$SORTIE/resume.txt"
for porte in typecheck lint test build test:int test:e2e; do
  nom="${porte/:/-}"
  debut=$(date +%s)
  PLAYWRIGHT_BROWSERS_PATH="$PONT" pnpm "$porte" > "$BRUT/$nom.log" 2>&1
  code=$?
  duree=$(( $(date +%s) - debut ))
  if [ "$porte" = "test:e2e" ]; then
    empreinte=$(sha256sum "$BRUT/$nom.log" | cut -d' ' -f1)
    sed 's/\x1b\[[0-9;]*m//g' "$BRUT/$nom.log" | grep -v '^\[WebServer\]' > "$SORTIE/$nom.txt"
    jetons=$(grep -c 'token=' "$SORTIE/$nom.txt")
    sed -i "1i # journal brut hors dépôt : sha256 $empreinte · lignes [WebServer] retirées · « token= » restants : $jetons (attendu 0)" "$SORTIE/$nom.txt"
  else
    sed 's/\x1b\[[0-9;]*m//g' "$BRUT/$nom.log" > "$SORTIE/$nom.txt"
  fi
  echo "$porte exit=$code duree=${duree}s" >> "$SORTIE/resume.txt"
done
echo "FINI · journaux bruts : $BRUT" >> "$SORTIE/resume.txt"
cat "$SORTIE/resume.txt"
