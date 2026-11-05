# FC-12 — LA GALERIE DE PHOTOS D'UNE FICHE ET SA VISIONNEUSE — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `01f3c259fd16c00e101ca857ef0625ea1ca91c9d` (dernier commit de FC-11, poussé, local = origin vérifié). Méthode : NORMALE
(aucun montant). Consigne : « galerie de photos + visionneuse (Échap, flèches inversées en RTL, retour du focus, alt, aucune dépendance
lourde, AA, les photos existantes) ». Backlog : « Magazine gallery (5 photos) + lightbox [CLIENT][P0] » (ouverte) ; le lot A8 avait livré
« Galerie sans visionneuse JS (lien vers l'original) » — ce lot GARDE ce lien comme repli sans JavaScript (amélioration progressive)
et y ajoute la visionneuse.
Ordre des commits : (1) cette table seule ; (2) les tests et leurs ROUGES — lus contre l'état d'avant, empreintes sha256 ; (3) le code ;
(4) le harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-12/table-ouverture.md` | cette table | 1 |
| 2 | `apps/client/src/components/venue/venue-detail-view.test.tsx` | la visionneuse, par la fiche RENDUE : un clic ouvre la photo choisie, Échap ferme et rend le focus, Tab reste dedans, les flèches suivent la lecture (inversées en arabe), un clic avec modificateur reste un lien, l'alt du pro dans la langue de la page | 2 |
| 3 | `docs/preuves/front-client/FC-12/rouges/rouge-client.txt` | sortie des tests contre l'état d'avant + sha256 | 2 |
| 4 | `apps/client/src/components/venue/venue-photos.tsx` | NEUF — la galerie et sa visionneuse (branchée sur `useDismissLayer`, le seul piège de focus du dépôt) | 3 |
| 5 | `apps/client/src/components/venue/venue-detail-view.tsx` | la fiche monte la galerie | 3 |
| 6 | `apps/client/src/app/theme.css` | la mise en page de la visionneuse (propriétés logiques, aucune couleur en dur) | 3 |
| 7 | `packages/i18n/messages/fr.json` | les libellés de la visionneuse | 3 |
| 8 | `packages/i18n/messages/ar.json` | leurs pendants arabes (à relire) | 3 |
| 9 | `docs/preuves/front-client/FC-12/arabe-a-relire.md` | les clés arabes neuves | 3 |
| 10 | `neutralisation/neutralize-fc12.py` | NEUF — le harnais du lot | 4 |
| 11 | `docs/preuves/front-client/FC-12/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 12 | `docs/preuves/front-client/FC-12/ancres-campagnes.txt` | relevé statique des ancres des campagnes concernées (`releve-ancres.py`) | 4 |
| 13 | `docs/preuves/front-client/FC-12/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 14 | `docs/preuves/front-client/FC-12/portes/typecheck.txt` | journal de porte | 4 |
| 15 | `docs/preuves/front-client/FC-12/portes/lint.txt` | journal de porte | 4 |
| 16 | `docs/preuves/front-client/FC-12/portes/test.txt` | journal de porte | 4 |
| 17 | `docs/preuves/front-client/FC-12/portes/build.txt` | journal de porte | 4 |
| 18 | `docs/preuves/front-client/FC-12/portes/test-int.txt` | journal de porte | 4 |
| 19 | `docs/preuves/front-client/FC-12/portes/test-e2e.txt` | journal de porte | 4 |
| 20 | `docs/preuves/front-client/FC-12/portes/resume.txt` | journal de porte | 4 |
| 21 | `docs/preuves/front-client/FC-12/audit-secrets-fc12.txt` | audit de secrets scellé | 4 |
| 22 | `docs/preuves/front-client/FC-12/tri-audit-fc12.txt` | son tri | 4 |
| 23 | `docs/preuves/front-client/FC-12/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 24 | `docs/preuves/front-client/FC-12/rapport.md` | le rapport du lot | 4 |

Conditionnels : un harnais d'un autre rang dont une ancre ou une mesure serait périmée par ce lot (le relevé et les campagnes le
diront) — déclaré par une extension, commitée seule, avant sa réorientation ; et sa sortie sous CRLF simulé s'il porte des ancres CRLF.

## Extension 1 — commitée SEULE, avant le fichier qu'elle déclare

| # | fichier | rôle | commit |
|---|---|---|---|
| 25 | `docs/preuves/front-client/FC-12/rouges/rouge-client-v2.txt` | le rouge REJOUÉ contre l'état d'avant après la correction d'un test (le retour du focus, mesuré SANS focus préalable) ; empreinte du test livré | 2 bis |

Motif : le test « Échap ferme, et le focus REVIENT à la vignette » donnait le focus à la vignette AVANT de cliquer : le retour du focus
passait alors même sans que la boîte sache d'où elle vient (`restoreFocusRef`), et une cible qui retirerait ce lien serait muette par
construction. Sur macOS, cliquer ne donne PAS le focus : le test clique désormais sans focus préalable. Le code étant mis de côté, le
rouge est rejoué : l'empreinte versée est celle du test livré.

## Extension 2 — commitée SEULE, avant les fichiers qu'elle déclare

| # | fichier | rôle | commit |
|---|---|---|---|
| 26 | `docs/preuves/front-client/FC-12/portes/test-rejeu.txt` | le REJEU UNIQUE de la porte `test` (même commande, même arbre) | 4 |
| 27 | `docs/preuves/front-client/FC-12/portes/act-intermittent.md` | la mesure de l'échec intermittent de la première passe : le fichier seul ×10, la suite client ×3, et sa cause lue | 4 |

Motif : la première passe de `pnpm test` rend 1 échec dans un fichier que ce lot ne touche PAS (`apps/client/src/components/account/
account-settings-view.test.tsx`, « un premier chiffre refusé reste SEUL… ») : la garde des sorties console, 5 avertissements `act(...)`
tardifs (`BookingsSection`, `VisitBookingsSection`). Mesuré ensuite : 10 passes du fichier seul et 3 de la suite client, toutes vertes.
Précédent du dépôt pour un rouge intermittent hors du lot : un REJEU UNIQUE de la porte (D338 ; D339, rejeu décidé par Ko), et la règle
d'arrêt de la consigne s'applique s'il est rouge.
