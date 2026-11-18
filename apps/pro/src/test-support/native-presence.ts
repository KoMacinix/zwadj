// Rang 54 (D352, R-2 ; S-192 REFUSÉE) — le VERDICT de présence d'un élément s'écrit en assertion NATIVE.
//
// Une requête `getBy…` / `findBy…` de Testing Library qui ne trouve rien LÈVE `TestingLibraryElementError` : l'échec se lit alors « Unable to find an element… », pas comme une assertion. D304 et D316 (mesurés sur
// vitest 3.2.7) : « sous une lecture fermée, un verdict s'écrit en assertion native » ; D325 (neuf gardes) et D345 (deux) l'ont fait écran par écran. Ces deux fonctions sont la même règle, écrite UNE fois pour les écrans
// `/admin` et le refus lu par le pro : la requête est `queryBy…` (elle rend `null`, ne lève jamais), le verdict est `expect(…).not.toBeNull()` (un `AssertionError`, première ligne d'un bloc d'échec lisible par le harnais).
//
// ⛔ Ce qui reste interdit : un verdict qui ne repose que sur une requête qui lève, ou sur un matcher jest-dom (`toBeInTheDocument`, `toHaveAttribute`, `toHaveTextContent`… échouent en `Error: expect(element)…`, pas en
// `AssertionError`). Ces matchers restent permis APRÈS la présence native, pour affiner ce qu'on a trouvé.
import { waitFor } from "@testing-library/react";
import { expect } from "vitest";

/** L'élément est là MAINTENANT : `requete` est une requête `queryBy…` (jamais `getBy…`). Rend l'élément ; sinon `AssertionError`. */
export function elementPresent<T extends Element>(requete: () => T | null, message?: string): T {
  const trouve = requete();
  expect(trouve, message).not.toBeNull();
  return trouve as T;
}

/** L'élément ARRIVE (la page lit, la réponse revient) : `waitFor` sur la même assertion native — l'échec est la dernière `AssertionError`, jamais « Unable to find ». */
export async function elementAttendu<T extends Element>(requete: () => T | null, message?: string): Promise<T> {
  await waitFor(() => expect(requete(), message).not.toBeNull());
  return requete() as T;
}
