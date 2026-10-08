// La frontière NAVIGATEUR du téléchargement d'un fichier — rang 33 (D326).
//
// Un `Blob` reçu de l'API n'est pas un fichier tant qu'un lien n'a pas été cliqué : on fabrique un lien TEMPORAIRE vers le Blob (`URL.createObjectURL`), on
// le clique avec l'attribut `download`, et on le défait. Ce geste est seul dans son fichier pour que les tests du parcours le REMPLACENT (jsdom n'implémente
// ni `createObjectURL` ni le téléchargement) et pour qu'il se mesure, lui, dans un vrai navigateur (la spec e2e du lot attend l'événement `download`).
//
// ⚠ `filename` vient de `quoteDocumentFilename` (`@zwadj/types`, UNE formule partagée avec le serveur) : aucune donnée personnelle. Il n'est pas
// dérivé du nom du client ni de la salle.

/** Délai avant de rendre l'URL temporaire : l'ôter immédiatement peut interrompre un téléchargement que le navigateur n'a pas encore lancé. */
const REVOKE_AFTER_MS = 30_000;

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}
