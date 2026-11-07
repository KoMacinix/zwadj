#!/usr/bin/env python3
"""Campagne de neutralisation — FC-10 (session `front-client`) : la fiche d'une salle porte ses données structurées.

Ce que le lot ajoute, et que chaque cible neutralise :
  · la fonction PURE (`apps/client/src/lib/seo.ts`, mesurée par `structured-data.test.ts`) : ⛔ l'échappement qui empêche un
    nom de salle de fermer la balise (S-1), la langue de la page (S-2), l'absence de prix (S-3), un champ absent qui ne
    s'invente pas (S-4) ;
  · l'INSERTION par la page (un composant serveur, D205) — mesurée par la spec e2e qui lit le HTML SERVI : S-5, jouée avec
    `--e2e`.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc10.py           # cibles unitaires ; la cible e2e s'imprime « NON MESURÉE », sortie 3
    python3 neutralisation/neutralize-fc10.py --e2e     # + la cible e2e (serveurs de dev sur 3100/3101/5273, base zwadj_e2e)
    FC10_DECOUVERTE=1 python3 neutralisation/neutralize-fc10.py --e2e
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

SEO = "apps/client/src/lib/seo.ts"
PAGE = "apps/client/src/app/[locale]/salles/[slug]/page.tsx"

campagne = socle.Campagne("fc10", {
    "fonction": socle.vitest("@zwadj/client", "src/lib/structured-data.test.ts"),
    "page": socle.playwright("specs/fc10-donnees-structurees.e2e.ts"),
})

campagne.cible("S-1. ⛔ l'échappement disparaît : un nom de salle peut fermer la balise `<script>`", SEO,
               '    .replace(/</g, "\\\\u003c")\n', "",
               {"fonction": "un nom qui contient `</script>` sort échappé, et le JSON relu est IDENTIQUE"})
campagne.cible("S-2. la page arabe décrit la salle en français", SEO,
               '  const ar = locale === "ar";\n  const nom = (ar ? venue.nameAr : venue.nameFr).trim();',
               '  const ar = false;\n  const nom = (ar ? venue.nameAr : venue.nameFr).trim();',
               {"fonction": "arabe : les champs ARABES — jamais le français en repli silencieux"})
campagne.cible("S-3. ⛔ un prix entre dans les données structurées (des centimes convertis par le front)", SEO,
               "    maximumAttendeeCapacity: venue.capacityMax,\n",
               "    maximumAttendeeCapacity: venue.capacityMax,\n"
               '    ...{ offers: { "@type": "Offer", price: venue.basePriceCents / 100, priceCurrency: "DZD" } },\n',
               {"fonction": "⛔ AUCUN prix : le serveur rend des centimes, pas un prix tel quel"})
campagne.cible("S-4. un champ absent s'invente : l'accroche vide est écrite quand même", SEO,
               '    ...(accroche === "" ? {} : { description: accroche }),', "    description: accroche,",
               {"fonction": "un champ absent n'est pas inventé : ni accroche, ni rue, ni photo, ni position"})
campagne.cible("S-5. ⛔ la page n'insère plus le JSON-LD (le composant serveur, invisible aux tests unitaires)", PAGE,
               '      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />\n', "",
               {"page": ["fr — le HTML servi de la fiche porte un EventVenue au nom de la salle, dans la langue de la page",
                         "ar — le HTML servi de la fiche porte un EventVenue au nom de la salle, dans la langue de la page"]})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
