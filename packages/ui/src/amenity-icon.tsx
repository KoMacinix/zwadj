// Icônes d'équipements (Lot A5, arbitrage 1).
//
// MAP STATIQUE EXPLICITE, jamais `lucide[iconName]` dynamique : l'accès indexé
// tue le tree-shaking (tout le paquet d'icônes finit dans le bundle) ET casse à
// l'exécution sur un nom inconnu. Ici, un nom absent de la map retombe
// simplement sur l'icône générique.
//
// Les noms de clés sont ceux servis par `AmenityDTO.icon` (noms lucide en
// kebab-case, cf. seed A1). `icon` peut valoir `null` en base — c'est le cas de
// `kosha`, qui n'a pas d'équivalent lucide : le repli est prévu, pas subi.
import {
  Accessibility,
  AirVent,
  Armchair,
  Baby,
  BedDouble,
  ChefHat,
  CookingPot,
  Crown,
  Heater,
  Lightbulb,
  MoonStar,
  PartyPopper,
  Projector,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Speaker,
  SquareParking,
  Trees,
  Users,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "air-vent": AirVent,
  heater: Heater,
  zap: Zap,
  "square-parking": SquareParking,
  accessibility: Accessibility,
  wifi: Wifi,
  "chef-hat": ChefHat,
  utensils: Utensils,
  "cooking-pot": CookingPot,
  snowflake: Snowflake,
  armchair: Armchair,
  users: Users,
  "moon-star": MoonStar,
  crown: Crown,
  trees: Trees,
  baby: Baby,
  "bed-double": BedDouble,
  speaker: Speaker,
  lightbulb: Lightbulb,
  projector: Projector,
  "shield-check": ShieldCheck,
  "party-popper": PartyPopper
};

/** Repli : `icon = null` (ex. `kosha`) ou nom hors map (seed enrichi plus tard). */
const FALLBACK: LucideIcon = Sparkles;

/**
 * Icône purement DÉCORATIVE : le libellé de l'équipement est toujours rendu à
 * côté (et vient de la data, `nameFr`/`nameAr`) — d'où `aria-hidden`, pour ne
 * pas doubler l'annonce du lecteur d'écran.
 */
export function AmenityIcon({ icon, size = 16 }: { icon: string | null; size?: number }) {
  const Icon = (icon && ICONS[icon]) || FALLBACK;
  return <Icon size={size} strokeWidth={1.75} aria-hidden focusable="false" />;
}
