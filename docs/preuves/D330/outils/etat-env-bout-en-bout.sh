#!/bin/bash
# D330 — l'outil etat-env.py joué BOUT EN BOUT sur un FAUX dépôt jetable (jamais sur le vrai `.env` avec une valeur distante) : les quatre issues de la décision 2 du relecteur (12/10/2026).
# Procédure archivée comme preuve (D291), jamais promue en instrument.
# Usage : bash docs/preuves/D330/outils/etat-env-bout-en-bout.sh <chemin ABSOLU de etat-env.py> <dossier jetable ABSOLU> > sortie.txt
# CAS 1 tout local → code 0 ; CAS 2 un hôte de tunnel → code 3 (« la passe NE DÉMARRE PAS »), et NI l'hôte NI le secret ne figurent dans la sortie ou le fichier écrit ;
# CAS 3 comparaison ouverture/clôture : identique → 0, un octet de plus → 4 (« la marque est refusée ») ; CAS 4 `apps/api/.env` absent → 2.
set -u
OUTIL="$1"; FAUX="$2"
rm -rf "$FAUX"; mkdir -p "$FAUX/apps/api" "$FAUX/apps/client" "$FAUX/packages/types" "$FAUX/e2e"
: > "$FAUX/pnpm-workspace.yaml"
printf 'DATABASE_URL=postgresql://u:SENTINELLE_SECRET_ZW330@localhost:5432/db\nCLIENT_URL=http://localhost:3000\nCORS_ORIGINS=http://localhost:3000\n' > "$FAUX/apps/api/.env"
printf 'NEXT_PUBLIC_API_URL=http://localhost:3101\n' > "$FAUX/apps/client/.env"
cd "$FAUX"
echo "=== CAS 1 — tout local : la passe PEUT démarrer"
python3 "$OUTIL" relever ouverture sortie > cas1.txt 2>&1; echo "code=$? (attendu 0)"; tail -3 cas1.txt
echo "=== CAS 2 — CLIENT_URL sur un tunnel : la passe NE DÉMARRE PAS"
printf 'DATABASE_URL=postgresql://u:SENTINELLE_SECRET_ZW330@localhost:5432/db\nCLIENT_URL=https://zw330-tunnel.exemple-invalide\nCORS_ORIGINS=http://localhost:3000,https://zw330-tunnel.exemple-invalide\n' > apps/api/.env
python3 "$OUTIL" relever ouverture-distante sortie > cas2.txt 2>&1; echo "code=$? (attendu 3)"; tail -4 cas2.txt
echo "    l'hôte distant ni le secret ne figurent NI dans la sortie NI dans le fichier écrit :"
grep -c "zw330-tunnel\|SENTINELLE" cas2.txt sortie/etat-env-ouverture-distante.txt cas1.txt sortie/etat-env-ouverture.txt | tr '\n' ' '; echo "(attendu 0 partout)"
echo "=== CAS 3 — comparaison ouverture / clôture : identique, puis un octet de plus"
printf 'DATABASE_URL=postgresql://u:SENTINELLE_SECRET_ZW330@localhost:5432/db\nCLIENT_URL=http://localhost:3000\nCORS_ORIGINS=http://localhost:3000\n' > apps/api/.env
python3 "$OUTIL" relever cloture sortie > /dev/null 2>&1
python3 "$OUTIL" comparer sortie/etat-env-ouverture.txt sortie/etat-env-cloture.txt | tail -2; echo "code=${PIPESTATUS[0]} (attendu 0)"
printf '# un commentaire de plus\n' >> apps/api/.env
python3 "$OUTIL" relever cloture-modifiee sortie > /dev/null 2>&1
python3 "$OUTIL" comparer sortie/etat-env-ouverture.txt sortie/etat-env-cloture-modifiee.txt | tail -3; echo "code=${PIPESTATUS[0]} (attendu 4)"
echo "=== CAS 4 — apps/api/.env ABSENT"
rm apps/api/.env
python3 "$OUTIL" relever absent sortie 2>&1 | tail -1; echo "code=${PIPESTATUS[0]} (attendu 2)"
