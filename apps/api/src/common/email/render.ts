/**
 * Interpolation minimale des templates email : remplace {var} par sa valeur.
 * Une variable absente est une ERREUR (on n'envoie jamais un email troué) —
 * comportement testé, volontairement strict.
 */
export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = vars[key];
    if (v === undefined) {
      throw new Error(`renderTemplate : variable manquante "${key}"`);
    }
    return String(v);
  });
}
