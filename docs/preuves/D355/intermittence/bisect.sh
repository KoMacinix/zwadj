#!/usr/bin/env bash
# Bissection de la régression d'injection Nest : applique un SOUS-ENSEMBLE des fichiers de production modifiés
# (copiés depuis scratchpad/patched/), joue la sonde (staff-login.int-spec.ts), puis REMET l'état d'avant.
# Usage : bisect.sh staff|clients|venues|module [...]
set -u
RACINE="/c/Users/benla/Desktop/MyProjct/Zwadj"
S="/c/Users/benla/AppData/Local/Temp/claude/5acfabb9f267091b/7586097e-410c-4b86-a2bd-8641137f3292/scratchpad"
cd "$RACINE" || exit 9

declare -a CHOISIS=()
for g in "$@"; do
  case "$g" in
    staff)   CHOISIS+=(apps/api/src/staff/staff-store.types.ts apps/api/src/staff/staff-store.prisma.ts apps/api/src/staff/staff-session.service.ts) ;;
    clients) CHOISIS+=(apps/api/src/clients/pro-client-store.types.ts apps/api/src/clients/pro-client-store.prisma.ts apps/api/src/clients/pro-clients.service.ts apps/api/src/clients/pro-clients.controller.ts) ;;
    venues)  CHOISIS+=(apps/api/src/venues/quote-store.types.ts apps/api/src/venues/quote-store.prisma.ts apps/api/src/venues/quotes.service.ts apps/api/src/venues/quotes.controller.ts) ;;
    module)  CHOISIS+=(apps/api/src/clients/client-record-audit.ts) ;;
    *) echo "groupe inconnu : $g"; exit 8 ;;
  esac
done

echo "== applique : ${CHOISIS[*]}"
for f in "${CHOISIS[@]}"; do cp "$S/patched/$f" "$f"; done

cd apps/api || exit 9
npx vitest run -c vitest.config.int.ts ${PROBE:-test/int/staff-login.int-spec.ts} 2>&1 | tr -d '\r' | sed -E 's/\x1b\[[0-9;]*m//g' > "$S/bisect-sortie.txt"
grep -E "Test Files|Tests |Nest can't resolve" "$S/bisect-sortie.txt" | head -4

cd "$RACINE" || exit 9
echo "== remet l'état d'avant"
for f in "${CHOISIS[@]}"; do
  case "$f" in
    apps/api/src/clients/client-record-audit.ts) rm -f "$f" ;;
    *) git checkout -- "$f" ;;
  esac
done
git status --porcelain | grep -E "apps/api/src/(staff|clients|venues)/[^ ]*$" | grep -vE "spec\.ts|int-spec" ; echo "(fin : rien d'autre que des specs ne doit rester modifié ci-dessus)"
