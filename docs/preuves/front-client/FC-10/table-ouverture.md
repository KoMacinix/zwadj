# FC-10 — LES DONNÉES STRUCTURÉES D'UNE FICHE (schema.org `EventVenue`) — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `669cdaeb442d3e0a471f3af576341fd1d152c3bc` (dernier commit de FC-9, poussé, local = origin vérifié). Méthode : NORMALE. Consigne : « schema.org `EventVenue` /
`Place` sur la page de salle (nom, adresse, capacité, image ; pas de prix sauf si le serveur le donne tel quel), FR + AR ; relevé
hreflang / sitemap / robots / canonical, sans y toucher ».
Ordre des commits : (1) cette table seule ; (2) le relevé SEO et les ROUGES — lus contre l'état d'avant, empreintes sha256 ;
(3) le code ; (4) le harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-10/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-10/releve-seo.md` | le RELEVÉ hreflang / sitemap / robots / canonical, au SHA de départ, sans rien toucher | 2 |
| 3 | `apps/client/src/lib/structured-data.test.ts` | NEUF — la fonction pure : `EventVenue`, langue de la page, aucun prix, aucun champ inventé, aucun `</script>` possible | 2 |
| 4 | `e2e/specs/fc10-donnees-structurees.e2e.ts` | NEUF — le HTML SERVI de la fiche porte l'`EventVenue`, en FR et en AR (un composant serveur ne se voit pas autrement, D205) | 2 |
| 5 | `docs/preuves/front-client/FC-10/rouges/rouge-client.txt` | sortie du test unitaire contre l'état d'avant + sha256 | 2 |
| 6 | `docs/preuves/front-client/FC-10/rouges/rouge-e2e.txt` | sortie de la spec e2e contre l'état d'avant + sha256 (lignes `[WebServer]` retirées) | 2 |
| 7 | `apps/client/src/lib/seo.ts` | `venueStructuredData` et `jsonLdScript`, pures | 3 |
| 8 | `apps/client/src/app/[locale]/salles/[slug]/page.tsx` | la page insère le JSON-LD | 3 |
| 9 | `neutralisation/neutralize-fc10.py` | NEUF — le harnais du lot | 4 |
| 10 | `docs/preuves/front-client/FC-10/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 11 | `docs/preuves/front-client/FC-10/ancres-campagnes.txt` | le relevé statique des ancres des campagnes concernées (`releve-ancres.py`) | 4 |
| 12 | `docs/preuves/front-client/FC-10/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 13 | `docs/preuves/front-client/FC-10/portes/typecheck.txt` | journal de porte | 4 |
| 14 | `docs/preuves/front-client/FC-10/portes/lint.txt` | journal de porte | 4 |
| 15 | `docs/preuves/front-client/FC-10/portes/test.txt` | journal de porte | 4 |
| 16 | `docs/preuves/front-client/FC-10/portes/build.txt` | journal de porte | 4 |
| 17 | `docs/preuves/front-client/FC-10/portes/test-int.txt` | journal de porte | 4 |
| 18 | `docs/preuves/front-client/FC-10/portes/test-e2e.txt` | journal de porte | 4 |
| 19 | `docs/preuves/front-client/FC-10/portes/resume.txt` | journal de porte | 4 |
| 20 | `docs/preuves/front-client/FC-10/audit-secrets-fc10.txt` | audit de secrets scellé | 4 |
| 21 | `docs/preuves/front-client/FC-10/tri-audit-fc10.txt` | son tri | 4 |
| 22 | `docs/preuves/front-client/FC-10/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 23 | `docs/preuves/front-client/FC-10/rapport.md` | le rapport du lot | 4 |

Conditionnels : un harnais d'un autre rang dont une ANCRE serait périmée par ce lot (le relevé le dira) — déclaré par une
extension, commitée seule, avant sa réorientation ; et sa sortie sous CRLF simulé s'il en porte. Aucune chaîne visible n'est
ajoutée ⇒ aucune clé arabe à relire (le JSON-LD reprend les noms que le pro a saisis).
