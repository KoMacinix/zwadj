#!/usr/bin/env bash
# =============================================================================
# D296 — REPRODUCTION : la `duration` du reporter JSON de vitest compte les hooks.
# =============================================================================
# PROCEDURE ARCHIVEE COMME PREUVE, JAMAIS PROMUE EN INSTRUMENT (regle de D291).
# Elle ne mesure pas les suites du depot : elle rejoue les TROIS BRAS du cadrage
# du rang 17 (piece 3) sur une suite temoin construite, lue par le reporter JSON
# que la piece 1 du cadrage prescrit comme source.
#
# Lancement, depuis la RACINE du depot :
#   bash docs/preuves/D296/reproduire.sh .neutralisation-journaux/D296
# Sorties : <dossier donne>/{positif,negatif,discrimination}.json, et le resume
# sur la sortie standard.
# ⛔ Sans argument, les sorties vont dans le dossier du script : c'est ainsi que
# les pieces archivees a cote ont ete produites. REJOUER SANS ARGUMENT DEPUIS
# docs/preuves/ ECRASERAIT L'ARCHIVE — toujours donner un dossier hors preuves.
#
# Attendus ecrits AVANT la mesure, recopies du cadrage (piece 3) :
#   positif        : max proche de 1 200 ms
#   negatif        : max sous 100 ms
#   discrimination : max sous 100 ms  (les 1 200 ms sont dans un beforeEach)
# =============================================================================
set -u
if [ ! -f pnpm-workspace.yaml ]; then
  echo "ERREUR : lancer depuis la racine du depot (pnpm-workspace.yaml absent)" >&2
  exit 2
fi
S="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$S}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
VT="apps/api/node_modules/.bin/vitest"
echo "vitest : $(cd apps/api && node -e "console.log(require('vitest/package.json').version)")"
echo "dossier temoin : $S"
echo "dossier de sortie : $OUT"
for b in positif negatif discrimination; do
  "$VT" run --root "$S" --config "$S/vitest.config.mjs" "$b.test.js" \
    --reporter=json --outputFile="$OUT/$b.json" >/dev/null 2>&1
  echo "$b : code de sortie vitest = $?"
done
for b in positif negatif discrimination; do
  node -e "
    const r = require(process.argv[1]);
    const t = r.testResults.flatMap((f) => f.assertionResults);
    const max = Math.max(...t.map((x) => x.duration));
    console.log(process.argv[2] + ' : tests parcourus = ' + t.length + ' | '
      + t.map((x) => x.title + ' = ' + x.duration.toFixed(1) + ' ms (' + x.status + ')').join(' ; ')
      + ' | max = ' + max.toFixed(1) + ' ms');
  " "$OUT/$b.json" "$b"
done
echo "attendus (cadrage, piece 3) : positif ~1200 · negatif < 100 · discrimination < 100"
