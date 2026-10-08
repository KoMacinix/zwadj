// Port du MOTEUR DE RENDU PDF — rang 33 (D326), décisions 3 et 6 du relecteur.
//
// ── Ce que ce port est, et ce qu'il n'est pas ───────────────────────────────────────────────────────────────────────────────────────────────
// Il reçoit du HTML COMPLET (déjà rempli, déjà échappé, polices comprises) et rend les octets d'un PDF. Il ne connaît NI le devis, NI l'acompte,
// NI une langue : « le moteur reçoit un modèle et des données ; il n'est pas écrit pour le seul acompte » (décision 6). Un second document
// (`UIP-D`, un contrat…) passe par le MÊME port avec un autre modèle — la difficulté (arabe, polices, sens) est la même pour tous.
//
// ⚠ AUCUN SDK AU-DESSUS DE CETTE LIGNE (AGENTS.md : « Adapters (ports) pour tout SDK externe ») : `playwright-core` ne s'importe que dans
// `playwright-pdf.renderer.ts`. Un service qui appellerait le navigateur en direct serait un service qu'on ne peut tester qu'avec un navigateur.
//
// ⚠ UNE PANNE N'EST PAS UN REFUS. Le port ne lève qu'UNE erreur, `PdfRenderUnavailableError` : le moteur n'a pas rendu (navigateur absent,
// délai, page refusée). Le service la traduit en 503 `QUOTE_DOCUMENT_UNAVAILABLE` — distincte du 409 d'un refus métier (« un refus métier ne se
// replie pas sur une panne », et l'inverse).
export const PDF_RENDERER = Symbol("PDF_RENDERER");

export interface PdfRenderer {
  /** Rend `html` (un document complet, autonome : aucune ressource externe) en PDF A4. */
  render(html: string): Promise<Buffer>;
}

export class PdfRenderUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Le moteur de rendu PDF n'a pas rendu le document.", { cause });
    this.name = "PdfRenderUnavailableError";
  }
}
