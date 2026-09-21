#!/usr/bin/env bash
# Portes de D298, dans l'ordre de CLAUDE.md, APRÈS la dernière modification du code.
# Usage, depuis la racine : bash docs/preuves/D298/portes/portes.sh <porte>...  (typecheck lint test build test:int)
# Chaque porte écrit son journal, son code de sortie LU SUR LA COMMANDE ELLE-MÊME (jamais sur une
# enveloppe `{ …; } > f`, qui rend 0 quand la commande dedans a rendu 1), et ses heures de début et de fin.
D=docs/preuves/D298/portes
for porte in "$@"; do
  nom=${porte//:/-}
  debut=$(date '+%d/%m/%Y %H:%M:%S'); t0=$(date +%s)
  pnpm "$porte" > "$D/porte-$nom.log" 2>&1 < /dev/null
  code=$?
  echo "$porte · code $code · début $debut · fin $(date '+%H:%M:%S') · $(( $(date +%s) - t0 )) s" | tee -a "$D/portes-codes.txt"
done
