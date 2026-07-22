// Port de stockage des médias (Flux A, Lot A0) — même patron que EMAIL_SENDER :
// le domaine ne parle JAMAIS à un SDK cloud, seulement à ce port. Adapter dev =
// disque local ; adapter S3-compatible différé au déploiement (cadrage Flux A).

export const MEDIA_STORAGE = Symbol("MEDIA_STORAGE");

/**
 * Clé d'objet = SEGMENT UNIQUE généré côté serveur : minuscules/chiffres/
 * tirets + une extension d'image de sortie. Ni séparateur de chemin, ni point
 * hors extension → la traversée de répertoire est impossible PAR CONSTRUCTION,
 * pas par filtrage. La hiérarchie (préfixes S3) est un souci d'organisation du
 * futur adapter prod, pas du contrat. Le nom de fichier de l'utilisateur n'est
 * JAMAIS reflété dans une clé.
 */
export const MEDIA_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,118}\.(webp|jpe?g|png)$/;

export function isValidMediaKey(key: string): boolean {
  return MEDIA_KEY_PATTERN.test(key);
}

/** Clé invalide passée au port : bug de l'appelant, jamais une entrée utilisateur. */
export class InvalidMediaKeyError extends Error {
  constructor(key: string) {
    super(`Clé média invalide : "${key}" (attendu : ${String(MEDIA_KEY_PATTERN)})`);
    this.name = "InvalidMediaKeyError";
  }
}

export interface MediaObject {
  body: Buffer;
  contentType: string;
}

export interface MediaStorage {
  /** Dépose (ou remplace) un objet. Idempotent sur ré-écriture de la même clé. */
  put(input: { key: string; body: Buffer; contentType: string }): Promise<{ key: string }>;
  /** Lit un objet ; null s'il n'existe pas (le 404 est un cas nominal, pas une erreur). */
  get(key: string): Promise<MediaObject | null>;
  /** Supprime ; silencieux si la clé n'existe pas (idempotent). */
  delete(key: string): Promise<void>;
  /** Chemin public RELATIF (`/api/v1/media/<clé>`) — les fronts préfixent par
   *  leur base API, exactement comme leurs appels fetch. L'adapter S3/CDN de
   *  prod pourra renvoyer un absolu sans changer les consommateurs. */
  publicUrl(key: string): string;
}
