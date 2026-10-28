#!/usr/bin/env bash
# D338 — les MESURES du cadrage de L36-2 : chaque commande est imprimée AVANT sa sortie brute, pour qu'une lecture puisse la rejouer.
# MODE D'EMPLOI : depuis la RACINE du dépôt, `bash docs/preuves/D338/mesures-cadrage.sh > docs/preuves/D338/mesures-cadrage.txt`
# (Git Bash : la redirection écrit les octets UTF-8 tels quels). L'arbre de code est celui de 985fd20 : aucun fichier de code n'a changé dans ce lot.
# INSTRUMENT : rien de calculé, rien d'interprété — des `grep`/`sed`/`ls`, et le NOMBRE de lignes/fichiers parcourus à côté de chaque réponse (D290).
set -u
cd "$(git rev-parse --show-toplevel)"
sec() { printf '\n══ %s\n' "$1"; }
cmd() { printf '$ %s\n' "$*"; eval "$*" 2>&1 | cut -c1-230; printf '[sortie : %s ligne(s)]\n' "$(eval "$*" 2>&1 | wc -l | tr -d ' ')"; }

sec "M1 — qui ÉCRIT le statut d'un devis (code de production) : la table des transitions et ses seules cibles"
cmd "grep -n -E 'to: ' apps/api/src/venues/quote-transitions.ts"
cmd "grep -rn -E 'nouveauStatut|quoteWrittenStatus|changerStatut' apps/api/src --include=*.ts | grep -v -E '\.spec\.ts|generated'"

sec "M2 — qui écrit ACCEPTED sur un DEVIS (écriture de production ; les lectures et les réservations sont à part)"
cmd "grep -rn -E 'QuoteStatus\.ACCEPTED|status: *\"ACCEPTED\"' apps/api/src --include=*.ts | grep -v -E '\.spec\.ts|generated'"

sec "M3 — audit_logs : le modèle existe-t-il, et qui y ÉCRIT (code de production)"
cmd "grep -n -A4 '^model AuditLog' apps/api/prisma/schema.prisma"
cmd "grep -rn -i -E 'auditLog|audit_log' apps/api/src --include=*.ts | grep -v -E 'generated'"

sec "M4 — les déclencheurs SQL déjà présents dans les migrations (précédent pour une garde inter-tables)"
cmd "grep -l -i -E 'CREATE( OR REPLACE)? (TRIGGER|FUNCTION)' apps/api/prisma/migrations/*/migration.sql"
cmd "ls apps/api/prisma/migrations | grep -c ."

sec "M5 — qui écrit bookings.quote_id (la conversion d'un devis)"
cmd "grep -rn -E 'quoteId: ' apps/api/src --include=*.ts | grep -v -E '\.spec\.ts|generated|where|select'"
cmd "grep -n -E 'quote_id|quoteId' apps/api/prisma/schema.prisma"

sec "M6 — l'écran du pro : l'ordre des étapes et ce qu'exige 'termsReady' (donc ce qu'il faut pour calculer un devis)"
cmd "grep -n -E 'const STEPS|const termsReady|quotes\.create\(|quotes\.revise\(|copiePourDevis' apps/pro/src/dashboard/walkin-journey.tsx"

sec "M7 — la règle de rang 41 : des noms SANS fiche sont refusés (contrat) ; aucune CHECK ne les lie en base"
cmd "sed -n '376,384p' packages/types/src/quote.ts"
cmd "grep -n -i -E 'CHECK|client_name' apps/api/prisma/migrations/20261022120000_pro_client_records/migration.sql | grep -v '^[0-9]*:--'"

sec "M8 — les contraintes qui portent sur sent_at, sent_via, accepted_at, status (migrations, commentaires retirés par le motif)"
cmd "grep -n -E 'quotes_sent_at_coherent|quotes_accepted_at_coherent|quotes_sent_via_not_blank|quotes_one_accepted_per_chain|quotes_one_sent_per_chain' apps/api/prisma/migrations/*/migration.sql | grep -v -E ':[0-9]+:--'"

sec "M9 — la forme de la référence : la formule, le motif du nom de fichier, et TOUS les appelants de production"
cmd "grep -n -E 'QUOTE_REFERENCE_PATTERN|export function (formatQuoteReference|quoteDocumentFilename)' packages/types/src/quote.ts"
cmd "grep -rn -E 'formatQuoteReference|quoteDocumentFilename' apps packages --include=*.ts --include=*.tsx | grep -v -E '\.spec\.ts|\.test\.ts|node_modules|/dist/|generated'"

sec "M10 — les créations de devis par la route HTTP dans les suites d'intégration (relevé partiel : hors créations par le service ou par SQL)"
cmd "grep -rn -E 'venues/.*quotes[\`\"]' apps/api/test/int --include=*.ts | cut -d: -f1 | sort | uniq -c"

sec "M11 — la pause des numéros : aucune suppression de devis dans le code de production, et la clé étrangère de la salle"
cmd "grep -rn -E 'quote\.(delete|deleteMany)|DELETE FROM quotes' apps/api/src --include=*.ts | grep -v -E '\.spec\.ts|generated'"
cmd "grep -n 'quotes_venue_id_fkey' apps/api/prisma/migrations/20260707000000_init/migration.sql"

sec "M12 — le moteur de rendu : les options du PDF (le filigrane se pose dans le HTML ; le moteur n'est pas modifié)"
cmd "grep -n -E 'page\.pdf|javaScriptEnabled|route\(' apps/api/src/documents/playwright-pdf.renderer.ts"

sec "M13 — un lecteur de PDF existe-t-il dans le dépôt (pour mesurer 'chaque page') ?"
cmd "grep -n -i -E 'pdfjs|pdf-parse|pdf-lib|pdfkit|pdf2json|unpdf' package.json apps/*/package.json packages/*/package.json"
cmd "grep -n -E 'pdfPageCount|pdfFonts|function fabriquePdf' apps/api/test/int/pdf-renderer.int-spec.ts"
