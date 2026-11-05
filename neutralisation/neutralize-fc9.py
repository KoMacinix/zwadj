#!/usr/bin/env python3
"""Campagne de neutralisation — FC-9 (session `front-client`) : les avertissements `act(...)` de la suite client.

Ce que le lot ajoute, et que chaque cible neutralise : les deux fichiers BRUYANTS corrigés à la source, qui ne sont plus exemptés
(`apps/client/src/test-setup.ts`) — leur bruit, s'il revient, doit faire TOMBER la suite par l'assertion de la garde :
  · K-1 — la fiche de salle (`venue-detail-view.test.tsx`) rendue NUE, comme avant FC-9 : ni dans `act`, ni en attendant l'état
    final ;
  · K-2 — le bouton Google, test « feature OFF » (`google-signin.test.tsx`), rendu hors de `act`.
⚠ MESURÉ AVANT D'ÉCRIRE LES CIBLES (D209, n° 2, « mutation auto-neutralisée ») : retirer SEULEMENT l'attente de l'état final de la
fiche laisse ses 20 tests verts — le rendu dans `act` suffit seul avec ces doubles, et l'attente seule aussi (elle tourne sous
`act`). Une cible qui n'en neutraliserait qu'un serait muette par construction : K-1 retire LES DEUX, c'est-à-dire la correction.
⚠ CE QUI N'A PAS DE CIBLE, ET POURQUOI — écrit plutôt que joué : `booking-request-panel.test.tsx` (ex-plafond 5) et
`filter-wizard.test.tsx` (ex-plafond 3) n'émettaient plus RIEN (relevé de FC-9, trois passes) : leur exemption tombe sans
correction, et aucune mutation ne la mesure — un fichier propre ne fait rougir aucune garde. La garde de BASE (un fichier non
exempté qui émet tombe) est prouvée par S8-2 de `neutralisation/neutralize-e3d1-s8.py`, sur l'étalon `test-setup-calibration.test.ts`.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc9.py
    FC9_DECOUVERTE=1 python3 neutralisation/neutralize-fc9.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

FICHE = "apps/client/src/components/venue/venue-detail-view.test.tsx"
GOOGLE = "apps/client/src/components/auth/google-signin.test.tsx"

campagne = socle.Campagne("fc9", {
    "fiche": socle.vitest("@zwadj/client", "src/components/venue/venue-detail-view.test.tsx"),
    "google": socle.vitest("@zwadj/client", "src/components/auth/google-signin.test.tsx"),
})

campagne.cible("K-1. ⛔ la fiche se rend NUE, comme avant FC-9 : ses quatre chargements écrivent APRÈS la fin du test", FICHE,
               "  let rendu: ReturnType<typeof render> | undefined;\n"
               "  await act(async () => {\n"
               "    rendu = render(\n"
               "      <NextIntlClientProvider locale={locale} messages={messages[locale]}>\n"
               "        <AuthProvider client={anonymousAuth()}>\n"
               "          <VenueDetailView venue={venue(over)} />\n"
               "        </AuthProvider>\n"
               "      </NextIntlClientProvider>\n"
               "    );\n"
               "  });\n"
               "  const fait = rendu!;\n"
               "  await within(fait.container).findByText(messages[locale].venueDetail.visit.none);\n"
               "  return fait;\n",
               "  // FC-9 NEUTRALISÉ : le rendu NU d'avant FC-9, ni dans `act`, ni en attendant l'état final.\n"
               "  return render(\n"
               "    <NextIntlClientProvider locale={locale} messages={messages[locale]}>\n"
               "      <AuthProvider client={anonymousAuth()}>\n"
               "        <VenueDetailView venue={venue(over)} />\n"
               "      </AuthProvider>\n"
               "    </NextIntlClientProvider>\n"
               "  );\n",
               {"fiche": "nom, commune, accroche, prix formaté et capacité",
                "fiche#2": "aucun `dir` en dur : l'orientation vient de <html>"})
campagne.cible("K-2. le test « feature OFF » du bouton Google se rend hors de `act` : l'amorçage de session écrit après lui", GOOGLE,
               "    await act(async () => {\n      rendu = renderGoogle(client);\n    });\n",
               "    rendu = renderGoogle(client); // FC-9 NEUTRALISÉ : rendu hors de `act`, rien d'attendu\n",
               {"google": "SANS NEXT_PUBLIC_GOOGLE_CLIENT_ID : ne rend RIEN et ne charge PAS le script Google (feature OFF)"})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
