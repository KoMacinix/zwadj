// ADM-2 (D350, rang 52, D-2) — TOUS les textes de l'administration, en FRANÇAIS seul, HORS de `packages/i18n`.
//
// ⛔ EXEMPTION ÉCRITE, BORNÉE AUX ÉCRANS `/admin` — arbitrage de Ko (D321, D-2) : « Les textes de l'admin vivent hors de `packages/i18n`, en français seul. Exemption écrite de l'invariant bilingue, bornée
// aux écrans `/admin`. » Ce fichier est cette exemption : aucun autre écran ne lit ce module, aucun catalogue ne porte de bloc `admin` (garde de source : `admin-source-guard.test.ts`). ⚠ Ce que le PRO lit d'un
// refus (D-5) reste bilingue, dans `packages/i18n`, sous la porte de parité — l'exemption ne couvre que ce que l'ADMIN lit.
//
// Ce fichier porte aussi les deux formateurs de l'écran (la date à l'heure d'Alger, le taux en pour cent) et la DISTINCTION entre un REFUS métier et une PANNE (MD-ADM-15, D217) : un refus n'est
// jamais présenté comme une panne, une panne jamais comme un refus ni comme une action faite.
// ⚠ AUCUN import : ce module est lu aussi par la spec e2e (`e2e/specs/r52-administration.e2e.ts`), qui ne résout ni `@zwadj/types` ni le client d'API de l'application — un module sans dépendance est le seul que les deux mondes partagent.

export const ADMIN_TEXTS = {
  shell: {
    brand: "Zwadj — Administration",
    navLabel: "Navigation de l'administration",
    venues: "Salles en attente",
    deletions: "Suppressions de compte",
    logout: "Se déconnecter"
  },
  forbidden: {
    title: "Espace réservé à l'administration",
    body: "Ce compte n'a pas accès à l'administration de Zwadj.",
    backToPro: "Retourner à mon espace",
    logout: "Se déconnecter"
  },
  common: {
    loading: "Chargement…",
    retry: "Réessayer"
  },
  queue: {
    title: "Salles en attente de validation",
    intro: "Les brouillons qui ont au moins un créneau actif. Les salles déjà rejetées sont rangées après les autres.",
    loadError: "La liste des salles en attente n'a pas pu être chargée.",
    empty: "Aucune salle en attente de validation.",
    pageGone: "Cette page n'existe plus : la liste a changé depuis votre dernière lecture.",
    total: (n: number): string => (n === 1 ? "1 salle en attente" : `${n} salles en attente`),
    number: (n: number): string => `Salle n° ${n}`,
    slots: (n: number): string => (n === 1 ? "1 créneau actif" : `${n} créneaux actifs`),
    rejectedBadge: "Déjà rejetée",
    rejectedOnLabel: "Rejetée le",
    rejectedReasonLabel: "Motif :",
    pagination: {
      label: "Pagination de la liste des salles",
      previous: "Page précédente",
      next: "Page suivante",
      page: (page: number, total: number): string => `Page ${page} sur ${total}`,
      backToFirst: "Revenir à la première page"
    }
  },
  review: {
    number: (n: number): string => `Salle n° ${n}`,
    /** Les trois états de publication (les valeurs de `VenuePublicationStatus`). */
    status: {
      DRAFT: "Brouillon",
      PENDING: "En cours de validation",
      PUBLISHED: "Publiée"
    },
    commission: "Commission",
    cashback: "Remise (cashback)",
    ratesReadOnly: "Ces deux taux sont affichés à titre d'information : ils ne se modifient pas depuis cet écran.",
    rejectedTitle: "Salle déjà rejetée",
    rejectedOn: (date: string): string => `Rejetée le ${date}`,
    reasonLabel: "Motif du rejet",
    reasonHint: "Ce motif est lu par le professionnel à l'étape « Publication » de sa salle.",
    publish: "Publier la salle",
    reject: "Rejeter la salle",
    correct: "Corriger le motif",
    published: "La salle est publiée.",
    rejectSaved: "Le rejet est enregistré. Le professionnel lit le motif à l'étape « Publication » de sa salle.",
    notFound: "Cette salle n'existe pas ou a été supprimée.",
    backToQueue: "Retour à la liste des salles en attente",
    loadError: "La salle n'a pas pu être chargée.",
    owner: "Professionnel",
    city: "Ville",
    statusLabel: "État de publication"
  },
  deletions: {
    title: "Demandes de suppression de compte",
    loadError: "La liste des demandes n'a pas pu être chargée.",
    empty: "Aucune demande de suppression en attente.",
    role: { PRO: "Professionnel", CLIENT: "Client", ADMIN: "Administrateur" },
    noReason: "Aucun motif indiqué par l'utilisateur.",
    requestedOn: (date: string): string => `Demandée le ${date}`,
    userReasonLabel: "Motif de l'utilisateur :",
    venueCount: (n: number): string => (n === 1 ? "1 salle serait archivée" : `${n} salles seraient archivées`),
    approve: "Approuver",
    reject: "Rejeter",
    approveDialog: {
      title: "Approuver la suppression de ce compte ?",
      description: (venueCount: number): string =>
        `Cette action est IRRÉVERSIBLE : le compte sera anonymisé et l'utilisateur ne pourra plus se connecter${
          venueCount > 0 ? `, et ${venueCount === 1 ? "sa salle sera archivée" : `ses ${venueCount} salles seront archivées`}` : ""
        }. Rien ne permet de revenir en arrière.`,
      confirm: "Approuver la suppression",
      cancel: "Annuler"
    },
    approved: (email: string): string => `La suppression du compte ${email} est approuvée.`,
    rejected: (email: string): string => `La demande de ${email} est rejetée : le compte reste actif.`,
    noteLabel: "Motif envoyé à l'utilisateur",
    noteHint: "L'utilisateur reçoit ce motif par e-mail : son compte reste actif et il doit savoir pourquoi.",
    confirmReject: "Confirmer le rejet",
    cancelReject: "Annuler"
  },
  errors: {
    refusedPrefix: "Refusé :",
    refusedGeneric: "L'action a été refusée par le serveur.",
    rights: "Votre session a expiré ou vos droits ne permettent plus cette action. Reconnectez-vous.",
    unknownOutcome: "Le résultat de l'action est inconnu : le serveur n'a pas répondu. La page est rechargée pour afficher l'état réel — vérifiez avant de recommencer.",
    /** Un texte pour CHAQUE code que les trois écrans peuvent recevoir d'un appel qu'ils déclenchent (S-183). L'autorité est l'ensemble des codes de `@zwadj/types` : `admin-texts.test.ts` le confronte. */
    codes: {
      VENUE_NOT_DRAFT: "Cette salle n'est plus un brouillon : elle a été publiée entre-temps. Une salle publiée ne se rejette pas.",
      VENUE_ALREADY_REJECTED: "Le motif de cette salle vient d'être modifié par une autre action. Relisez le motif en vigueur avant de recommencer.",
      SLOT_TEMPLATE_REQUIRED: "Cette salle n'a aucun créneau actif : elle ne peut pas être publiée tant que son professionnel n'en a pas activé un.",
      VENUE_NOT_FOUND: "Cette salle n'existe pas ou a été supprimée.",
      DELETION_REQUEST_NOT_PENDING: "Cette demande n'est plus en attente : elle a déjà été décidée ou l'utilisateur l'a annulée.",
      DELETION_REQUEST_NOT_FOUND: "Cette demande n'existe plus."
    },
    /** Un texte pour CHAQUE clé de validation que les schémas partagés peuvent rendre — plus la clé propre à l'écran des suppressions (le motif d'un rejet y est exigé). */
    validation: {
      "admin.validation.rejectionReasonRequired": "Le motif est obligatoire : sans lui, le professionnel ne saurait pas quoi corriger.",
      "admin.validation.rejectionReasonTooLong": "Le motif est trop long (1 000 caractères au plus).",
      "admin.validation.pageInvalid": "Le numéro de page n'est pas valide.",
      "admin.validation.pageSizeRange": "La taille de page n'est pas valide.",
      "admin.validation.unknownKey": "La demande contient un champ inconnu.",
      "account.validation.decisionNoteTooLong": "Le motif est trop long (1 000 caractères au plus).",
      "admin.validation.decisionNoteRequired": "Le motif est obligatoire : l'utilisateur dont le compte reste actif doit savoir pourquoi."
    }
  }
} as const;

/** Ce qu'un écran fait d'une erreur d'API : un REFUS métier (un code que l'API a rendu en 4xx), les DROITS (401, 403 : l'API reste l'autorité), ou une issue INCONNUE (réseau, 5xx, valeur levée
 *  qui n'est pas une erreur). ⛔ MD-ADM-15, D217 : jamais un refus présenté comme une panne, jamais une panne présentée comme un refus. */
export type AdminProblem = { kind: "refused" | "rights" | "unknown"; text: string };

export function classifyAdminError(error: unknown): AdminProblem {
  if (isApiError(error)) {
    if (error.status === 401 || error.status === 403) return { kind: "rights", text: ADMIN_TEXTS.errors.rights };
    if (error.status >= 400 && error.status < 500) {
      const connu = (ADMIN_TEXTS.errors.codes as Record<string, string | undefined>)[error.code];
      return { kind: "refused", text: connu ?? ADMIN_TEXTS.errors.refusedGeneric };
    }
  }
  return { kind: "unknown", text: ADMIN_TEXTS.errors.unknownOutcome };
}

/** Une erreur d'API (`ApiError` : un statut HTTP et un code métier), reconnue par sa FORME et son nom — ce module n'importe rien. Le réseau coupé (`NetworkError`), une valeur levée qui n'est pas une erreur
 *  et tout le reste ne sont PAS des erreurs d'API : l'issue est inconnue. */
function isApiError(error: unknown): error is { status: number; code: string } {
  const e = error as { name?: unknown; status?: unknown; code?: unknown } | null;
  return typeof e === "object" && e !== null && e.name === "ApiError" && typeof e.status === "number" && typeof e.code === "string";
}

/** Le texte français d'une clé de validation (message d'un schéma partagé), ou le texte générique d'un refus. */
export function validationText(key: string | undefined): string {
  return (key !== undefined ? (ADMIN_TEXTS.errors.validation as Record<string, string | undefined>)[key] : undefined) ?? ADMIN_TEXTS.errors.refusedGeneric;
}

/** UNE date, à l'heure d'ALGER (UTC+1, sans heure d'été) — le fuseau n'est jamais dérivé de la locale (D48, D56). Pas d'heure : ce que l'admin lit est le JOUR du refus ou de la demande (D57 interdit
 *  `Intl` pour l'heure). */
export function formatAdminDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-DZ", { timeZone: "Africa/Algiers", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

/** Un taux en points de base, en pour cent, avec ses décimales significatives (250 → « 2,5 % »). */
export function formatBps(bps: number): string {
  return `${new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(bps / 100)}\u00a0%`;
}
