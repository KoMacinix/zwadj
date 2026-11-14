#!/usr/bin/env python3
"""Campagne de neutralisation — CA-5 (session parallèle « carte ») : le point posé par le pro.

Ce que le lot ajoute, et que chaque cible neutralise :
  · K-n  `apps/pro/src/venues/venue-pin-map.tsx` — la carte s'ouvre au geste, en mode « poser », et rend la position ;
  · W-n  `apps/pro/src/venues/venue-form.tsx` — `pinOfFields` (la position que portent les deux champs) et `PlaceFields`
         (la carte écrit latitude ET longitude ensemble, et lit sa position dans les champs).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-ca5.py
    CA5_DECOUVERTE=1 python3 neutralisation/neutralize-ca5.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py` (module partagé, D305).
⚠ Le vrai clic sur la vraie carte est mesuré dans un navigateur : `e2e/specs/ca6-carte.e2e.ts` (lot CA-6). L'arrondi à six
décimales est mesuré chez le client (`neutralize-ca2.py`, T-7) : `roundCoordinate` vit dans `@zwadj/ui`.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

CARTE = "apps/pro/src/venues/venue-pin-map.tsx"
FORMULAIRE = "apps/pro/src/venues/venue-form.tsx"

campagne = socle.Campagne("ca5", {
    "carte": socle.vitest("@zwadj/pro", "src/venues/venue-pin-map.test.tsx"),
    "formulaire": socle.vitest("@zwadj/pro", "src/venues/place-fields-map.test.tsx"),
})

K_AVANT = "⛔ tant que le pro n'a rien demandé : un bouton, AUCUNE carte chargée"
K_OUVRIR = "le geste ouvre la carte en mode « POSER » (aucun point de salle), avec la consigne ; sans position connue, aucun point"
W_UN = "⛔ UN SEUL champ rempli n'est pas une position (latitude seule, puis longitude seule)"
W_BORNES = "une saisie illisible ou hors des bornes du contrat n'est pas une position"
W_POSER = "⛔ poser le point écrit la latitude ET la longitude, ensemble — et la paire passe le contrat partagé"
W_RESTENT = "les deux champs texte RESTENT (le chemin clavier), et la carte reçoit la position qu'ils portent"

campagne.cible("K-1. ⛔ La carte du pro est ouverte (et chargée) sans qu'il l'ait demandée", CARTE,
               "const [ouverte, setOuverte] = useState(false);", "const [ouverte, setOuverte] = useState(true);", {"carte": K_AVANT})
campagne.cible("K-2. La carte s'ouvre en mode lecture : on ne peut rien y poser", CARTE,
               "            pin={pin}\n", "", {"carte": K_OUVRIR})
campagne.cible("K-3. La position des champs n'est pas celle du point montré", CARTE,
               "            pin={pin}\n", "            pin={null}\n",
               {"carte": "la position que portent les champs est celle du point montré"})
campagne.cible("K-4. ⛔ Le point posé sur la carte ne remonte pas au formulaire", CARTE,
               "            onPinChange={onPick}\n", "",
               {"carte": "⛔ un point posé sur la carte remonte TEL QUEL à l'appelant (latitude et longitude ensemble)"})
campagne.cible("K-5. La consigne de la carte n'est pas affichée", CARTE,
               '<p className="field-hint">{t("map.pin.hint")}</p>', '<p className="field-hint">{t("map.pin.label")}</p>',
               {"carte": K_OUVRIR})
campagne.cible("K-6. « Masquer la carte » ne la retire pas", CARTE,
               "onClick={() => setOuverte((v) => !v)}", "onClick={() => setOuverte(true)}", {"carte": "« Masquer la carte » la retire"})
campagne.cible("K-7. ⛔ Sans fond de carte, le bouton est offert quand même", CARTE,
               "  if (tiles === null) {\n", "  if (tiles === null && ouverte) {\n",
               {"carte": "⛔ pas de fond de carte : c'est dit, et il n'y a pas de bouton — les deux champs restent le seul chemin"})

campagne.cible("W-1. ⛔ Une latitude SEULE devient une position (longitude 0)", FORMULAIRE,
               'if (typeof position.lat !== "number" || typeof position.lng !== "number") return null;',
               'if (typeof position.lat !== "number") return null;\n  if (typeof position.lng !== "number") position.lng = 0;',
               {"formulaire": W_UN})
campagne.cible("W-2. Une position hors des bornes du contrat est montrée", FORMULAIRE,
               "return isMapPosition(pin) ? pin : null;", "return pin;", {"formulaire": W_BORNES})
campagne.cible("W-3. ⛔ Poser le point n'écrit que la latitude", FORMULAIRE,
               "onPick={(p) => onChange({ lat: String(p.lat), lng: String(p.lng) })}", "onPick={(p) => onChange({ lat: String(p.lat) })}",
               {"formulaire": W_POSER})
campagne.cible("W-4. ⛔ Poser le point n'écrit que la longitude", FORMULAIRE,
               "onPick={(p) => onChange({ lat: String(p.lat), lng: String(p.lng) })}", "onPick={(p) => onChange({ lng: String(p.lng) })}",
               {"formulaire": W_POSER})
campagne.cible("W-5. Latitude et longitude sont écrites dans le mauvais champ", FORMULAIRE,
               "onChange({ lat: String(p.lat), lng: String(p.lng) })", "onChange({ lat: String(p.lng), lng: String(p.lat) })",
               {"formulaire": W_POSER})
campagne.cible("W-6. La carte ne lit plus sa position dans les champs", FORMULAIRE,
               "<VenuePinMap pin={pinOfFields(values.lat, values.lng)} ", "<VenuePinMap pin={null} ", {"formulaire": W_RESTENT})
campagne.cible("W-7. La carte lit les champs à l'envers", FORMULAIRE,
               "pin={pinOfFields(values.lat, values.lng)}", "pin={pinOfFields(values.lng, values.lat)}", {"formulaire": W_RESTENT})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
