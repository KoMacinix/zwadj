#!/usr/bin/env python3
"""Campagne de neutralisation — FC-12 (session `front-client`) : la galerie d'une fiche et sa visionneuse.

Ce que le lot ajoute (`apps/client/src/components/venue/venue-photos.tsx`), et que chaque cible neutralise — mesuré par la fiche RENDUE
(`venue-detail-view.test.tsx`) :
  · V-1 — la boîte n'est plus branchée sur le piège de focus partagé (`useDismissLayer`) : Échap ne ferme rien, Tab en sort ;
  · V-2 — la boîte ne sait plus d'où elle vient (`restoreFocusRef`) : le focus ne revient pas à la vignette (cliquer ne donne pas le
    focus sur macOS — le test clique SANS focus préalable, c'est ce qui rend cette cible mesurable) ;
  · V-3 — les flèches ne suivent plus la lecture : en arabe, la gauche recule ;
  · V-4 — l'alt de la visionneuse ne suit plus la langue de la page ;
  · V-5 — un clic avec modificateur ouvre la boîte (le lien n'est plus un lien) ;
  · V-6 — « précédente » et « suivante » s'affichent pour une seule photo ;
  · V-7 — la galerie ne boucle plus (« précédente » s'arrête à la première).
⚠ CE QUI N'A PAS DE CIBLE, ET POURQUOI — écrit plutôt que joué : retirer `preventDefault` laisse la boîte s'ouvrir dans jsdom (qui ne
navigue pas) — mutation muette par construction, sa garde serait un navigateur réel ; retirer `<VenuePhotos>` de la fiche fait
échouer les tests par une REQUÊTE Testing Library (liste introuvable), qu'un lecteur strict ne compte pas comme une morsure (D304).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc12.py
    FC12_DECOUVERTE=1 python3 neutralisation/neutralize-fc12.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

GALERIE = "apps/client/src/components/venue/venue-photos.tsx"

campagne = socle.Campagne("fc12", {
    "fiche": socle.vitest("@zwadj/client", "src/components/venue/venue-detail-view.test.tsx"),
})

campagne.cible("V-1. ⛔ la boîte n'est plus branchée sur le piège de focus partagé : Échap ne ferme rien, Tab en sort", GALERIE,
               "useDismissLayer({ open: true, panelRef: boite,", "useDismissLayer({ open: false, panelRef: boite,",
               {"fiche": "⛔ Échap ferme, et le focus REVIENT à la vignette qui l'a ouverte",
                "fiche#2": "le focus reste DANS la boîte : Tab depuis le dernier bouton revient au premier"})
campagne.cible("V-2. ⛔ la boîte ne sait plus d'où elle vient : le focus ne revient pas à la vignette (clic sans focus, macOS)", GALERIE,
               "initialFocusRef: fermerBouton, restoreFocusRef: declencheur, lockScroll: true",
               "initialFocusRef: fermerBouton, lockScroll: true",
               {"fiche": "⛔ Échap ferme, et le focus REVIENT à la vignette qui l'a ouverte"})
campagne.cible("V-3. ⛔ les flèches ne suivent plus la lecture : en arabe, la gauche recule", GALERIE,
               'if ((event.key === "ArrowRight") !== ar) suivante();', 'if (event.key === "ArrowRight") suivante();',
               {"fiche": "⛔ en arabe (RTL), les flèches sont INVERSÉES : la GAUCHE mène à la photo suivante"})
campagne.cible("V-4. l'alt de la visionneuse ne suit plus la langue de la page", GALERIE,
               '          className="photo-viewer-img"\n          src={mediaSrc(photo.url)}\n          alt={(ar ? photo.altAr : photo.altFr) ?? ""}',
               '          className="photo-viewer-img"\n          src={mediaSrc(photo.url)}\n          alt={photo.altFr ?? ""}',
               {"fiche": "⛔ en arabe (RTL), les flèches sont INVERSÉES : la GAUCHE mène à la photo suivante"})
campagne.cible("V-5. un clic avec modificateur ouvre la boîte : le lien cesse d'être un lien", GALERIE,
               "    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;\n", "",
               {"fiche": "un clic avec MODIFICATEUR (Ctrl) reste un lien : la visionneuse ne s'ouvre pas"})
campagne.cible("V-6. « précédente » et « suivante » s'affichent pour une seule photo", GALERIE,
               "        {total > 1 ? (", "        {total > 0 ? (",
               {"fiche": "une seule photo : la boîte n'a que « Fermer » — ni précédente ni suivante"})
campagne.cible("V-7. la galerie ne boucle plus : « précédente » s'arrête à la première", GALERIE,
               "const precedente = () => onIndex((index - 1 + total) % total);",
               "const precedente = () => onIndex(Math.max(index - 1, 0));",
               {"fiche": "en français, la flèche DROITE mène à la photo suivante, la GAUCHE à la précédente — et la galerie boucle"})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
