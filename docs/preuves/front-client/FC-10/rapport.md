# FC-10 — LES DONNÉES STRUCTURÉES D'UNE FICHE (schema.org `EventVenue`) — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `669cdae` (FC-9 poussé, local = origin vérifié). Commits du lot : `cccd671` (table,
seule) → `a1296dd` (relevé SEO, rouges) → `52c0219` (extension 1, seule) → `9ea0649` (code) → le commit de clôture. Méthode
NORMALE : aucun montant n'est calculé, converti ni affiché.

## Fait
- **Deux fonctions PURES** (`apps/client/src/lib/seo.ts`, D205) : `venueStructuredData` rend l'objet `EventVenue` de la fiche —
  nom et accroche dans la langue de la PAGE (une fiche `/ar/…` décrit la salle en arabe), adresse (rue et quartier, commune, pays
  `DZ`), capacité (`maximumAttendeeCapacity`), photos en URL ABSOLUES (`mediaSrc`), position si le pro l'a saisie, URL canonique
  (la même fonction que `publicMetadata`) ; un champ absent n'est PAS inventé. `jsonLdScript` écrit le JSON en échappant `<`, `>`,
  `&`, U+2028 et U+2029 : les textes viennent du pro, et un nom contenant `</script>` fermerait sinon la balise.
- **L'insertion par la page** (`apps/client/src/app/[locale]/salles/[slug]/page.tsx`, composant serveur) : un
  `<script type="application/ld+json">` dans le HTML SERVI — lu par un robot qui n'exécute aucun script.
- **⛔ Aucun prix** : le serveur rend des CENTIMES (`basePriceCents`), pas un prix « tel quel » ; l'écrire obligerait le front à le
  convertir (consigne : « pas de prix sauf si le serveur le donne tel quel »).
- **Rouges avant le code** (`a1296dd`) : la fonction pure, 5 sur 6 en `AssertionError` (« aucun prix » vert À VIDE, bras de
  calibration) ; le HTML servi en fr et en ar, 2 sur 2 (« Expected 1, Received 0 » : aucun `EventVenue`).
- **Harnais** `neutralisation/neutralize-fc10.py` : **5 sur 5 mordues** avec `--e2e` — l'échappement (S-1), la langue (S-2), un
  prix qui entre (S-3), un champ inventé (S-4), et la page qui n'insère plus rien (S-5, que seul le HTML servi voit).
- **Campagnes** (`campagnes.txt`) : fc8 10/10 (+ G-7, G-8 en `--e2e`, hors de ce que ce lot touche), fc10 4/4 (+ S-5, mordue avec
  `--e2e`), available-on arrêtée sur son ancre CRLF (environnement) → **sous CRLF simulé 10/10** (`crlf/available-on.txt`). Relevé
  statique des ancres : 27 sur 27, 0 périmée, 2 CRLF (environnement).

## Le relevé SEO (`releve-seo.md`) — rien n'y est touché
`canonical` absolue sur les 10 pages publiques ; `robots` conforme à D216. **Trois ABSENCES, rapportées comme défauts croisés** :
aucune `hreflang` (les versions `/fr` et `/ar` d'une page ne se déclarent pas l'une l'autre), aucun `sitemap.xml`, aucun
`robots.txt` (les deux tombent sur la 404 racine). À ouvrir dans un lot dédié.

## Pas fait, et pourquoi
- Le prix : voir plus haut (centimes, aucune conversion côté front).
- Les avis et la note (`aggregateRating`) : hors MVP (consigne, § 4 : « avis »).
- `hreflang`, `sitemap`, `robots` : relevés, pas touchés (consigne).

## Décisions prises seul — ce qu'elles changent pour Ko
1. **`EventVenue`** plutôt que `Place` : c'est le type schema.org d'un lieu qui accueille des événements, sous-type de `Place` —
   un robot qui lit `Place` le lit aussi. Pour Ko : rien à faire.
2. **La description du JSON-LD est l'ACCROCHE** (comme `generateMetadata`, qui l'écrit déjà en `description`), jamais la
   description longue tronquée. Pour Ko : rien à faire.

## ⚠ Un incident de la session, dit ici
La pièce du rouge e2e a d'abord été composée en filtrant les lignes `[WebServer]` AVANT de retirer les codes ANSI : deux lignes
portant un jeton de vérification d'e-mail de la base e2e JETABLE (`zwadj_e2e`, recréée à chaque passe, hôte local) sont restées
dans la pièce, et elle a été commitée. **Vu avant tout push** (le compte des « token= » de la pièce rendait 2) ; le commit, LOCAL,
a été corrigé (`42dbf3a` → `a1296dd`, codes ANSI retirés PUIS lignes filtrées : 186 retirées, 0 « token= ») — **aucun jeton n'a
atteint le distant** (vérifié : `git grep` sur `origin/front-client`, 0). C'est la famille D275 (un extracteur qui répond sans lever) ;
le pilote des portes, lui, retire les codes ANSI d'abord — c'était la seule pièce composée à la main dans cet ordre.

## Arabe à relire
Aucune chaîne visible n'est ajoutée : le JSON-LD reprend les textes que le pro a saisis.

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · test 0 (api-client 59/6 · api 1 096/71 · **client 480/41** · pro 676/43 — 2 311 tests, 161 fichiers ; client
+6 tests et +1 fichier sur FC-9) · build 0 · test:int **614/619** — les 5 rouges sont DANS l'ensemble d'entrée (`etat-entree.md` :
les tests de concurrence MD-1 et F-1 à F-6) : MD-1 ×2, F-1, F-2, F-3 : **pas « vert », à jouer à l'intégration** · e2e 0 (75
passés — dont les deux de ce lot —, 1 ignoré, 0 échec ; « token= » restants 0).

## Audit de secrets
`audit-secrets-fc10.txt` (scellée) et `tri-audit-fc10.txt` : 5 alertes nouvelles, lues au contexte — 0 valeur réelle.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
