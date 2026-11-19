// La TABLE DES CAPACITÉS du personnel — rang 56, L36-3a-2 (D354, R-2, cadrage D340 § 5.4, S-107, S-239). Une DONNÉE (`capacité → rôle → niveau`) et une fonction pure `peut`. Changer la décision de la salle pilote
// (Q7) = changer UNE ligne de cette table : c'est la raison pour laquelle elle est une donnée, pas une suite de `if` dans un garde.
//
// ⛔ CE QUE LA TABLE DIT (consigne, § 1 c — adoptée COMME DÉFAUT en attendant la réponse de la salle pilote) : un EMPLOYÉ peut l'agenda, les demandes, les devis, les clients et les réservations ; il LIT la salle, les
// prix et les prestations sans les changer ; il ne touche ni au personnel ni au compte. Le MANAGER peut tout. Les plages de VISITE (`visit-availabilities`) sont du côté « salle » : défaut fermé du cadrage.
// ⚠ UN SEUL ENDROIT : la table est lue par le quatrième garde global (côté serveur) et le sera par les écrans (L36-4) pour masquer ce qu'un employé ne peut pas faire — jamais recopiée dans l'un ou l'autre.
// ⚠ `lib: ["ES2022"]` SEULE (`packages/types`) : aucun global DOM ni Node ici.
import type { StaffRole } from "./staff";

/** Les onze capacités du cadrage D340 § 5.4. `reservations` et `annuaire` n'ont aujourd'hui aucun contrôleur déclarant (même contrôleur que `demandes` ; annuaire = lot L36-5) : ce sont des LIGNES DE DONNÉES. */
export const StaffCapability = {
  AGENDA: "agenda",
  DEMANDES: "demandes",
  DEVIS: "devis",
  CLIENTS: "clients",
  RESERVATIONS: "reservations",
  ANNUAIRE: "annuaire",
  SALLE: "salle",
  PRIX: "prix",
  PRESTATIONS: "prestations",
  PERSONNEL: "personnel",
  COMPTE: "compte"
} as const;
export type StaffCapability = (typeof StaffCapability)[keyof typeof StaffCapability];

/** Ce qu'un rôle peut faire d'une capacité : `write` (✓ du cadrage : lire et écrire), `read` (« lecture seule »), `none` (« — » : ni l'un ni l'autre, pas même lire). */
export const StaffAccess = { WRITE: "write", READ: "read", NONE: "none" } as const;
export type StaffAccess = (typeof StaffAccess)[keyof typeof StaffAccess];

/** L'ACTE jugé : lire (GET, HEAD, OPTIONS) ou écrire (tout le reste — fermé par défaut). */
export type StaffAct = "read" | "write";

const ligne = (manager: StaffAccess, employee: StaffAccess): Readonly<Record<StaffRole, StaffAccess>> => Object.freeze({ MANAGER: manager, EMPLOYEE: employee });

export const STAFF_CAPABILITIES: Readonly<Record<StaffCapability, Readonly<Record<StaffRole, StaffAccess>>>> = Object.freeze({
  agenda: ligne(StaffAccess.WRITE, StaffAccess.WRITE),
  demandes: ligne(StaffAccess.WRITE, StaffAccess.WRITE),
  devis: ligne(StaffAccess.WRITE, StaffAccess.WRITE),
  clients: ligne(StaffAccess.WRITE, StaffAccess.WRITE),
  reservations: ligne(StaffAccess.WRITE, StaffAccess.WRITE),
  annuaire: ligne(StaffAccess.WRITE, StaffAccess.WRITE),
  salle: ligne(StaffAccess.WRITE, StaffAccess.READ),
  prix: ligne(StaffAccess.WRITE, StaffAccess.READ),
  prestations: ligne(StaffAccess.WRITE, StaffAccess.READ),
  personnel: ligne(StaffAccess.WRITE, StaffAccess.NONE),
  compte: ligne(StaffAccess.WRITE, StaffAccess.NONE)
});

/**
 * Ce rôle peut-il cet acte sur cette capacité ? ⛔ FERMÉ PAR DÉFAUT : une capacité ou un rôle INCONNUS (une faute de frappe dans une déclaration, une valeur lue d'ailleurs) sont refusés — jamais une levée d'exception
 * qui deviendrait une 500, jamais un « oui » par défaut. S-239 : `peut(role, capacité)` à DEUX arguments répond à « peut-il UTILISER cette capacité » = écrire ; le troisième dit « lire seulement » (la table a trois
 * états par rôle, deux arguments ne les portent pas).
 */
export function peut(role: StaffRole, capability: StaffCapability, act: StaffAct = "write"): boolean {
  if (!Object.prototype.hasOwnProperty.call(STAFF_CAPABILITIES, capability)) return false;
  const ligneDeLaCapacite = STAFF_CAPABILITIES[capability];
  if (!Object.prototype.hasOwnProperty.call(ligneDeLaCapacite, role)) return false;
  const niveau = ligneDeLaCapacite[role];
  return act === "read" ? niveau !== StaffAccess.NONE : niveau === StaffAccess.WRITE;
}
