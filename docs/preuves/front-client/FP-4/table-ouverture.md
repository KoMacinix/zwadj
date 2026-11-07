# FP-4 — RAFRAÎCHIR LE PANNEAU GAUCHE ET LE SÉLECTEUR APRÈS LES ENREGISTREMENTS — table d'ouverture (premier commit du lot, SEUL) · lot **ARRÊTÉ** (prémisse fausse)

SHA de départ : `bcb51fd2b7c217538f1d14e79f0bd2ca62285d3f` (dernier commit de FP-3, poussé, local = origin vérifié). Consigne : « rafraîchir le
panneau gauche et le sélecteur de salle après les enregistrements (S-4 de D331 ; `ProVenuesProvider` source unique ; la garde
`ma-salle-relecture.test.tsx` tient) ».
La lecture a été faite AVANT cette table, sans aucune écriture au dépôt : le panneau gauche (`dashboard-aside.tsx`), le sélecteur (`venue-scope.tsx`), le
libellé « Ma salle / Mes salles » (`pro-nav.tsx`) et le fournisseur (`pro-venues-context.tsx`) n'affichent QUE le nom, le compte et des compteurs lus par
l'API à partir de l'identifiant de la salle ; aucune des cinq sections de l'assistant (créneaux, prestations, acompte, photos, visite virtuelle) n'écrit
une donnée que ces surfaces montrent, et « Enregistrer » de l'étape 1 relit déjà la liste (D331). La prémisse est FAUSSE.
⇒ Aucun code, aucun test, aucun harnais : les fichiers du lot sont la pièce d'arrêt. Aucune porte n'est rejouée : aucun fichier qu'une porte lit ne
change (D292 : `docs/preuves/` ne compte pas).

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FP-4/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FP-4/arret.md` | la pièce « ARRÊTÉ » : la prémisse confrontée au code, le défaut croisé trouvé à côté, les options pour Ko | 2 |
| 3 | `docs/preuves/front-client/FP-4/audit-secrets-fp4.txt` | audit de secrets scellé | 3 |
| 4 | `docs/preuves/front-client/FP-4/tri-audit-fp4.txt` | son tri | 3 |
| 5 | `docs/preuves/front-client/FP-4/controle.txt` | sortie du contrôle de fin de lot | 3 |
