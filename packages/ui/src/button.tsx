// Composant d'exemple minimal — prouve l'import cross-package.
// Les vrais tokens (zinc + framboise #C81E63, Readex Pro) arriveront avec
// l'extraction des design tokens (backlog 2.1) — pas de styling au squelette.
import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, ...rest }: ButtonProps) {
  return (
    <button type="button" {...rest}>
      {children}
    </button>
  );
}
