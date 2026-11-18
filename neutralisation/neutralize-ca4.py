#!/usr/bin/env python3
"""Campagne de neutralisation — CA-4 (session parallèle « carte ») : la position de la salle sur sa fiche.

Ce que le lot ajoute, et que chaque cible neutralise :
  · F-n  `apps/client/src/components/venue/venue-location-map.tsx` — la carte de la fiche ne se monte qu'au GESTE (R-9) ;
  · D-n  `apps/client/src/components/venue/venue-detail-view.tsx` — la carte n'est offerte que si la salle a ses DEUX
         coordonnées, sous l'adresse (R-7).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-ca4.py
    CA4_DECOUVERTE=1 python3 neutralisation/neutralize-ca4.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py` (module partagé, D305).
⚠ La vraie carte est mesurée dans un navigateur : `e2e/specs/ca6-carte.e2e.ts` (lot CA-6).
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

CARTE = "apps/client/src/components/venue/venue-location-map.tsx"
FICHE = "apps/client/src/components/venue/venue-detail-view.tsx"

campagne = socle.Campagne("ca4", {
    "carte": socle.vitest("@zwadj/client", "src/components/venue/venue-location-map.test.tsx"),
    "fiche": socle.vitest("@zwadj/client", "src/components/venue/venue-detail-view.test.tsx"),
})

T_AVANT = "⛔ à l'ouverture de la fiche : un bouton et l'annonce du service externe — AUCUNE carte n'est chargée (R-9)"
T_GESTE = "⛔ le geste monte la carte : UN point, à la position de la salle, sous SON nom ; la carte est nommée d'après elle"
T_ARABE = "en arabe : le libellé du bouton, et la carte sait que la page se lit de droite à gauche"
T_SANS_FOND = "⛔ pas de fond de carte : c'est dit en une ligne, et il n'y a PAS de bouton"
D_SITUEE = "⛔ une salle située : la carte est posée SOUS L'ADRESSE, à SA position, sous son nom"
D_UNE = "⚠ UNE seule coordonnée n'est pas une position : latitude seule, puis longitude seule ⇒ pas de carte"

campagne.cible("F-1. ⛔ R-9 : la carte de la fiche est montée dès l'ouverture, sans geste", CARTE,
               "const [montee, setMontee] = useState(false);", "const [montee, setMontee] = useState(true);", {"carte": T_AVANT})
campagne.cible("F-2. Le service externe n'est plus annoncé avant le clic", CARTE,
               '{t("venue.notice")}', '{t("venue.show")}', {"carte": T_AVANT})
campagne.cible("F-3. Latitude et longitude du point sont interverties", CARTE,
               'markers={[{ id: "venue", lat, lng, label: name }]}', 'markers={[{ id: "venue", lat: lng, lng: lat, label: name }]}',
               {"carte": T_GESTE})
campagne.cible("F-4. Le point ne porte pas le nom de la salle", CARTE,
               'markers={[{ id: "venue", lat, lng, label: name }]}', 'markers={[{ id: "venue", lat, lng, label: "" }]}',
               {"carte": T_GESTE})
campagne.cible("F-5. La carte n'est pas nommée d'après la salle", CARTE,
               'useMapLabels(t("venue.region", { name }))', "useMapLabels()", {"carte": T_GESTE})
campagne.cible("F-6. La carte ne reçoit pas le sens d'écriture de la page", CARTE,
               "labels={labels} rtl={ar} loadCanvas", "labels={labels} rtl={false} loadCanvas", {"carte": T_ARABE})
campagne.cible("F-7. ⛔ Sans fond de carte, le bouton est offert quand même", CARTE,
               "  if (tiles === null) {\n", "  if (tiles === null && montee) {\n", {"carte": T_SANS_FOND})

campagne.cible("D-1. ⛔ La fiche ne pose plus la carte d'une salle située", FICHE,
               "{venue.lat !== null && venue.lng !== null ? <VenueLocationMap",
               "{venue.lat !== null && venue.lng !== null && venue.lat > 90 ? <VenueLocationMap", {"fiche": D_SITUEE})
campagne.cible("D-2. ⛔ Une latitude SEULE suffit à offrir la carte", FICHE,
               "{venue.lat !== null && venue.lng !== null ? <VenueLocationMap lat={venue.lat} lng={venue.lng}",
               "{venue.lat !== null ? <VenueLocationMap lat={venue.lat} lng={venue.lng ?? 0}", {"fiche": D_UNE})
campagne.cible("D-3. ⛔ Une longitude SEULE suffit à offrir la carte", FICHE,
               "{venue.lat !== null && venue.lng !== null ? <VenueLocationMap lat={venue.lat} lng={venue.lng}",
               "{venue.lng !== null ? <VenueLocationMap lat={venue.lat ?? 0} lng={venue.lng}", {"fiche": D_UNE})
campagne.cible("D-4. La carte reçoit le nom français dans une page arabe", FICHE,
               "lng={venue.lng} name={name} ar={ar} />", "lng={venue.lng} name={venue.nameFr} ar={ar} />",
               {"fiche": "en arabe : la carte reçoit le nom ARABE de la salle et le sens d'écriture de la page"})
campagne.cible("D-5. Latitude et longitude sont interverties par la fiche", FICHE,
               "<VenueLocationMap lat={venue.lat} lng={venue.lng} ", "<VenueLocationMap lat={venue.lng} lng={venue.lat} ",
               {"fiche": D_SITUEE})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
