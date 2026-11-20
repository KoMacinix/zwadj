// Le JOURNAL des écritures d'une FICHE CLIENT — rang 57 (D355, R-2, DR5). Module PUR : aucune dépendance (ni Nest, ni Prisma, ni un autre module du dépôt, D187). Il construit la charge utile d'`audit_logs.create` ;
// l'ÉCRITURE est le travail des magasins (`pro-client-store.prisma.ts`, `quote-store.prisma.ts`), dans la transaction de l'écriture — une action sans trace, ou une trace sans action, est MD-ADM-6.
//
// ⛔ LA LIGNE DIT QUI, QUELLE FICHE, QUELS CHAMPS ET QUAND — JAMAIS UNE VALEUR (MP-33 ; même règle que D349 et S-81 de D339) : ni numéro, ni e-mail, ni nom. Elle porte les NOMS des champs écrits, dans un ordre
// fixe, dérivés du MÊME objet que celui que l'instruction écrit (`champsEcrits`) : le journal ne peut pas dire autre chose que ce qui a été écrit. `before` n'est JAMAIS écrit (la valeur d'avant est une donnée
// personnelle). Une ligne sans champ, avec un champ inconnu ou répété, ou une action qui n'est pas l'une des trois est une erreur de PROGRAMMATION : elle LÈVE — un journal qui se tairait sur ce qu'il n'a pas compris mentirait.
// ⛔ `actor_member_id` est le membre dont la session de personnel a passé le garde (la couche activée), `null` sinon : l'acteur est alors le compte commun (`actor_id`).
// ⚠ `quoteId` n'a qu'une place : la complétion du nom d'une fiche par la boîte de langue d'un devis (K-5). Un identifiant n'est pas une donnée personnelle ; il distingue cette complétion de celle que le pro fait
// directement (K-3), sous la MÊME action.

/** Les quatre champs d'une fiche qu'une écriture peut toucher, dans l'ORDRE FIXE de la ligne. */
export const FICHE_CHAMPS = ["phone", "email", "nameAr", "nameLatin"] as const;
export type FicheChamp = (typeof FICHE_CHAMPS)[number];

/** Les trois actions du journal des fiches : la liste est FERMÉE. */
export const FICHE_AUDIT_ACTIONS = ["client_record.create", "client_record.update", "client_record.complete_names"] as const;
export type FicheAuditAction = (typeof FICHE_AUDIT_ACTIONS)[number];

/** Qui écrit : le compte commun (le Bearer) ET le membre dont la session a passé le garde (`null` : couche éteinte). */
export interface FicheAuteur {
  readonly userId: string;
  readonly memberId: string | null;
}

/** Exactement les sept clés d'`audit_logs` que ce module écrit — `before` n'en fait pas partie. */
export interface FicheAuditEntry {
  actorId: string;
  actorRole: "PRO";
  actorMemberId: string | null;
  action: FicheAuditAction;
  entityType: "client_record";
  entityId: string;
  after: { fields: FicheChamp[]; quoteId?: string };
}

/**
 * Les NOMS des champs que cet objet écrit : ceux dont la valeur n'est ni absente (`undefined`) ni nulle (`null`), dans l'ordre fixe. Il ne rend JAMAIS une valeur. K-2 reçoit `null` pour ce que la fiche n'a pas ;
 * K-3 et K-3b ne reçoivent que les clés envoyées.
 */
export function champsEcrits(donnees: { readonly [champ in FicheChamp]?: string | null }): FicheChamp[] {
  return FICHE_CHAMPS.filter((champ) => donnees[champ] !== undefined && donnees[champ] !== null);
}

/** La ligne de journal d'une écriture de fiche. Lève sur une ligne sans champ, avec un champ inconnu ou répété, une action inconnue, ou un `quoteId` hors de `client_record.complete_names`. */
export function ficheAuditEntry(args: {
  readonly auteur: FicheAuteur;
  readonly action: FicheAuditAction;
  readonly ficheId: string;
  readonly champs: readonly FicheChamp[];
  readonly quoteId?: string;
}): FicheAuditEntry {
  if (!FICHE_AUDIT_ACTIONS.includes(args.action)) throw new Error(`journal des fiches : action inconnue « ${String(args.action)} »`);
  if (args.champs.length === 0) throw new Error("journal des fiches : une ligne sans champ écrit n'a rien à consigner");
  const inconnus = args.champs.filter((champ) => !FICHE_CHAMPS.includes(champ));
  if (inconnus.length > 0) throw new Error(`journal des fiches : champ inconnu « ${inconnus.join(", ")} » (liste fermée : ${FICHE_CHAMPS.join(", ")})`);
  if (new Set(args.champs).size !== args.champs.length) throw new Error("journal des fiches : un champ ne se consigne qu'une fois");
  if (args.quoteId !== undefined && args.action !== "client_record.complete_names") throw new Error(`journal des fiches : « quoteId » n'existe que pour client_record.complete_names, pas pour ${args.action}`);
  const fields = FICHE_CHAMPS.filter((champ) => args.champs.includes(champ));
  return {
    actorId: args.auteur.userId,
    actorRole: "PRO",
    actorMemberId: args.auteur.memberId,
    action: args.action,
    entityType: "client_record",
    entityId: args.ficheId,
    after: args.quoteId === undefined ? { fields } : { fields, quoteId: args.quoteId }
  };
}
