import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SectionErrorBoundary } from "@zwadj/ui";

/**
 * D120 — enveloppe une section de l'écran salle dans sa PROPRE frontière.
 *
 * ⚠ Une frontière par section, jamais une seule autour de la page : une
 * frontière trop haute rattrape la chute mais efface tout ce qu'elle englobe.
 * L'objectif est qu'une section qui lâche coûte UNE section.
 *
 * Le titre passe en clair plutôt qu'en clé : la frontière doit pouvoir
 * s'afficher même si c'est le rendu du titre traduit qui a échoué.
 */
export function GuardedSection({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <SectionErrorBoundary
      title={title}
      message={t("venue.ui.sectionFailed")}
      onError={(error) => {
        // Sans ceci, une section qui tombe en production tombe en SILENCE :
        // l'utilisateur voit un encart, personne d'autre ne voit rien.
        console.error(`[section] ${title} a échoué au rendu`, error);
      }}
    >
      {children}
    </SectionErrorBoundary>
  );
}
