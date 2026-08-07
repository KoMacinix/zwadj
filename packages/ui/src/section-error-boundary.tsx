import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * D120 — FRONTIÈRE D'ERREUR DE SECTION.
 *
 * ⚠ Pourquoi ceci existe : jusqu'ici le dépôt n'en contenait AUCUNE — zéro
 * occurrence, pas d'`error.tsx` App Router non plus. Une exception levée
 * pendant le rendu démontait donc l'arbre entier. Mesuré : une réponse
 * aberrante sur les visites emportait les demandes ET les prestations de
 * `venue-calendar-page`. Une section casse, la page part avec — dont les devis.
 *
 * ⚠ Ce que cette frontière NE remplace PAS : les gardes de forme. Elles restent
 * la première ligne, et elles rendent un état lisible plutôt qu'un message
 * d'échec. La frontière est le filet — elle existe pour que la PROCHAINE
 * section, celle qu'on oubliera de garder, coûte une section et pas une page.
 * Le motif s'est déjà répété deux fois sur six sections ; il se répétera.
 *
 * ⚠ Granularité : une frontière PAR SECTION, jamais une seule autour de la
 * page. Une frontière trop haute rattrape la chute mais efface quand même tout
 * ce qu'elle englobe — elle transformerait l'écran blanc en écran d'erreur,
 * sans rien sauver.
 *
 * Volontairement une classe : React n'expose `getDerivedStateFromError` /
 * `componentDidCatch` qu'aux composants de classe. C'est le seul endroit du
 * dépôt où la contrainte s'applique.
 */
export interface SectionErrorBoundaryProps {
  children: ReactNode;
  /** Message affiché à la place de la section. Le titre reste visible : on
   *  veut que l'utilisateur SACHE laquelle des sections a lâché. */
  title: string;
  message: string;
  /** Remonté au journal applicatif — sans quoi une section qui tombe en
   *  production tombe en silence. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  failed: boolean;
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="panel" data-section-failed="true">
        <h2>{this.props.title}</h2>
        <p className="field-error" role="alert">
          {this.props.message}
        </p>
      </section>
    );
  }
}
