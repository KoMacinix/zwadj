// Lot A6a-P — volet PHOTOS de l'écran d'édition d'une salle.
//
// SECTION AUTONOME, montée HORS du <form> principal (même patron que
// `virtual-tour-section.tsx`) : quatre endpoints distincts du PATCH général,
// donc ses propres boutons. Imbriquer un submit dans un autre est invalide en
// HTML et ferait partir deux requêtes sur une touche Entrée.
//
// PROPRIÉTÉ DE L'ÉTAT — la règle qui gouverne tout le reste : la section
// possède son propre tableau `photos`, initialisé UNE FOIS depuis le DTO. Elle
// refetch par `getMine` quand il le faut et ne met à jour QUE son état ; elle
// n'appelle JAMAIS le `load()` de la page, qui repasserait l'écran en
// « loading » et réécraserait les saisies non enregistrées du formulaire
// principal. Aucun `useEffect` de resynchronisation sur la prop non plus : un
// enregistrement du formulaire principal produit un nouvel objet `venue` et
// réinitialiserait la galerie au milieu d'une file d'upload.
//
// L'état affiché après mutation vient TOUJOURS de la réponse serveur ou d'un
// refetch, jamais d'une reconstruction devinée :
//   ajout        → un VenuePhotoDTO, ajouté en fin de liste (sortOrder = max+1
//                  garanti serveur, on ne recalcule rien) ;
//   ordre        → le tableau complet, SUBSTITUÉ EN BLOC ;
//   alt          → un VenuePhotoDTO, remplacé en place, à sa position ;
//   suppression  → 204 sans corps : SEUL cas qui force un refetch réseau.
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@zwadj/ui";
import type { FieldErrors } from "@zwadj/api-client";
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  VENUE_MEDIA_CAPS,
  VENUE_PHOTO_LIMITS,
  type VenuePhotoDTO
} from "@zwadj/types";
import { useApiErrorMessage, useValidationMessage } from "../auth/auth-ui";
import { mediaSrc } from "../lib/media-url";
import { venueFieldErrors } from "./venue-errors";
import { useVenueCrud, useVenueMedia } from "./venue-client-context";

/** Échec UNITAIRE d'un fichier : la file continue, les réussies restent. */
interface FileFailure {
  name: string;
  message: string;
}

/** Refus AVANT tout appel réseau (plafond ou excédent). */
type Preflight = { kind: "limit" } | { kind: "excess"; remaining: number } | null;

const ACCEPT = ACCEPTED_IMAGE_MIME_TYPES.join(",");

export function PhotosSection({ venueId, initialPhotos }: { venueId: string; initialPhotos: VenuePhotoDTO[] }) {
  const { t } = useTranslation();
  // ⚠ SEUL ÉCRAN À CROISER DEUX FAMILLES (S9) : il relit la salle après
  // chaque écriture de média. Deux crochets plutôt qu'une interface
  // « photos + lecture » faite sur mesure — une interface à un seul client
  // ment sur sa généralité, et deviendrait le fourre-tout suivant.
  const salles = useVenueCrud();
  const medias = useVenueMedia();
  const toMessage = useApiErrorMessage();
  const tval = useValidationMessage();
  const inputId = useId();

  // Consommé UNE FOIS : cf. en-tête (aucune resynchronisation sur la prop).
  const [photos, setPhotos] = useState<VenuePhotoDTO[]>(initialPhotos);

  const [uploading, setUploading] = useState(false);
  const [orderPending, setOrderPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [preflight, setPreflight] = useState<Preflight>(null);
  const [failures, setFailures] = useState<FileFailure[]>([]);
  /** Erreur de SECTION (ordre, refetch, suppression) — jamais de champ. */
  const [sectionError, setSectionError] = useState<string | null>(null);

  const [openAltId, setOpenAltId] = useState<string | null>(null);
  const [altDraft, setAltDraft] = useState<{ altFr: string; altAr: string }>({ altFr: "", altAr: "" });
  const [altSaving, setAltSaving] = useState(false);
  const [altSaved, setAltSaved] = useState(false);
  const [altErrors, setAltErrors] = useState<FieldErrors>({});
  const [altError, setAltError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const cap = VENUE_MEDIA_CAPS.photosPerVenue;
  const remaining = cap - photos.length;
  /** Toute opération qui change L'ENSEMBLE verrouille les autres : une file
   *  d'upload en cours rendrait un ensemble d'ordre incomplet (400). */
  const mutating = uploading || orderPending || deleting;

  /** Recharge la galerie SEULE, sans toucher au formulaire principal. */
  async function refetch(): Promise<void> {
    try {
      const venue = await salles.getMine(venueId);
      setPhotos(venue.photos);
    } catch {
      setSectionError(t("venue.ui.photos.refreshError"));
    }
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const selected = Array.from(e.target.files ?? []);
    // Remise à zéro : sans ça, resélectionner le MÊME fichier ne déclenche
    // aucun `change` et le pro croit à un bug.
    e.target.value = "";
    if (selected.length === 0) return;

    setPreflight(null);
    setFailures([]);
    setSectionError(null);

    // Pré-validation de CONFORT (le serveur revalide toujours, par sniffing) :
    // type MIME et taille. AUCUN contrôle de dimensions côté client.
    const rejected: FileFailure[] = [];
    const queue: File[] = [];
    for (const file of selected) {
      if (!(ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
        rejected.push({ name: file.name, message: t("media.errors.unsupportedFormat") });
      } else if (file.size > VENUE_PHOTO_LIMITS.maxBytes) {
        rejected.push({ name: file.name, message: t("media.errors.tooLarge") });
      } else {
        queue.push(file);
      }
    }
    if (rejected.length > 0) setFailures(rejected);
    if (queue.length === 0) return;

    // Comptage du plafond AVANT de démarrer la file, sur existantes + en file :
    // l'excédent est refusé tout de suite, pas au 25ᵉ fichier après quatre
    // minutes d'upload. Refus de la sélection ENTIÈRE (décision d'exécution) :
    // envoyer « les N premiers » ferait un tri arbitraire dans le dos du pro.
    if (remaining <= 0) {
      setPreflight({ kind: "limit" });
      return;
    }
    if (queue.length > remaining) {
      setPreflight({ kind: "excess", remaining });
      return;
    }

    // File SÉQUENTIELLE, jamais parallèle : ré-encodage sharp côté serveur, et
    // le plafond se compte. Un échec unitaire ne stoppe pas la file.
    setUploading(true);
    for (const file of queue) {
      try {
        const created = await medias.addPhoto(venueId, file);
        setPhotos((current) => [...current, created]);
      } catch (error) {
        setFailures((current) => [...current, { name: file.name, message: toMessage(error) }]);
      }
    }
    setUploading(false);
  }

  // ── Réordonnancement ───────────────────────────────────────────────────────

  /** `delta` = -1 (avancer dans l'ordre) ou +1 (reculer). */
  async function move(index: number, delta: -1 | 1): Promise<void> {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;

    const next = [...photos];
    const moved = next[index];
    const swapped = next[target];
    if (!moved || !swapped) return;
    next[index] = swapped;
    next[target] = moved;

    setSectionError(null);
    setOrderPending(true);
    try {
      // ENSEMBLE COMPLET, jamais un delta ni un sortOrder par photo. L'ordre
      // affiché ne change QU'ICI, au remplacement en bloc par le tableau
      // retourné : aucun rollback à conserver, aucun état intermédiaire.
      const server = await medias.reorderPhotos(venueId, { photoIds: next.map((photo) => photo.id) });
      setPhotos(server);
    } catch {
      // Tout échec se traite pareil — PHOTO_ORDER_MISMATCH comme un 500 ou une
      // coupure réseau : refetch + « rafraîchis et réessaie ». Jamais un
      // rollback depuis un instantané local, jamais un échec muet.
      setSectionError(t("venue.ui.photos.orderError"));
      await refetch();
    } finally {
      setOrderPending(false);
    }
  }

  // ── Alt FR/AR ──────────────────────────────────────────────────────────────

  function toggleAlt(photo: VenuePhotoDTO): void {
    setAltErrors({});
    setAltError(null);
    setAltSaved(false);
    if (openAltId === photo.id) {
      setOpenAltId(null);
      return;
    }
    setOpenAltId(photo.id);
    setAltDraft({ altFr: photo.altFr ?? "", altAr: photo.altAr ?? "" });
  }

  async function saveAlt(photoId: string): Promise<void> {
    setAltSaving(true);
    setAltErrors({});
    setAltError(null);
    setAltSaved(false);
    try {
      // Les DEUX champs partent TOUJOURS, même inchangés : le schéma est
      // `.strict()` avec un `.refine(len > 0)`, un corps `{}` part en 400.
      // Et une chaîne vide n'est PAS un effacement : `optionalText` est
      // `.trim().min(1)`, `""` donnerait 400 venue.validation.textEmpty —
      // l'effacement explicite, c'est `null`.
      const updated = await medias.updatePhotoAlt(venueId, photoId, {
        altFr: altDraft.altFr.trim() || null,
        altAr: altDraft.altAr.trim() || null
      });
      setPhotos((current) => current.map((photo) => (photo.id === updated.id ? updated : photo)));
      setAltSaved(true);
    } catch (error) {
      // Deux chemins EXISTANTS, pas un troisième : les erreurs de VALIDATION
      // arrivent en `issues` (la pipe Zod n'émet pas de `code`, `messageKey`
      // n'y est pas une clé i18n) et vont sur leur champ ; les erreurs CODÉES
      // (PHOTO_NOT_FOUND…) portent bien leur clé et passent par
      // `useApiErrorMessage`.
      const fields = venueFieldErrors(error);
      if (fields) setAltErrors(fields);
      else setAltError(toMessage(error));
    } finally {
      setAltSaving(false);
    }
  }

  // ── Suppression ────────────────────────────────────────────────────────────

  async function confirmDelete(photoId: string): Promise<void> {
    setConfirmingId(null);
    setSectionError(null);
    setDeleting(true);
    try {
      await medias.deletePhoto(venueId, photoId);
      if (openAltId === photoId) setOpenAltId(null);
      // 204 sans corps : AUCUN retrait local. La couverture n'a pas de cas
      // particulier — elle est re-résolue depuis l'état issu du refetch.
      await refetch();
    } catch (error) {
      setSectionError(toMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <section>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          margin: "10px 0 0"
        }}
      >
        {t("venue.ui.photos.section")}
      </h2>
      <p className="field-hint">{t("venue.ui.photos.hint")}</p>

      <div className="field">
        <div className="field-head">
          <label htmlFor={inputId}>{t("venue.ui.photos.inputLabel")}</label>
        </div>
        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(e) => void onFilesSelected(e)}
          disabled={mutating || remaining <= 0}
        />
        <p className="field-hint">
          {remaining > 0 ? t("venue.ui.photos.remainingSlots", { count: remaining }) : t("venue.ui.photos.limitReached")}
        </p>
      </div>

      {uploading ? (
        <p role="status" style={{ color: "var(--ink-2)" }}>
          {t("venue.ui.photos.uploading")}
        </p>
      ) : null}

      {preflight ? (
        <p className="alert alert-error" role="alert">
          {preflight.kind === "limit"
            ? t("venue.ui.photos.limitReached")
            : `${t("venue.ui.photos.tooMany")} ${t("venue.ui.photos.remainingSlots", { count: preflight.remaining })}`}
        </p>
      ) : null}

      {failures.length > 0 ? (
        <div className="alert alert-error" role="alert">
          <p style={{ margin: 0 }}>{t("venue.ui.photos.uploadFailed")}</p>
          <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
            {failures.map((failure) => (
              <li key={failure.name}>
                {failure.name} — {failure.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sectionError ? (
        <p className="alert alert-error" role="alert">
          {sectionError}
        </p>
      ) : null}

      {photos.length === 0 ? (
        <p style={{ color: "var(--ink-2)" }}>{t("venue.ui.photos.empty")}</p>
      ) : (
        // Propriétés LOGIQUES uniquement, aucun `dir="ltr"` : en interface
        // arabe la première photo (la couverture) est à DROITE, c'est voulu.
        <ul
          aria-label={t("venue.ui.photos.section")}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 14,
            listStyle: "none",
            margin: "12px 0 0",
            padding: 0
          }}
        >
          {photos.map((photo, index) => {
            const altOpen = openAltId === photo.id;
            return (
              <li
                key={photo.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  background: "var(--surface)",
                  overflow: "hidden"
                }}
              >
                {/* `width`/`height` du DTO (dimensions du LARGE) posés en
                    attributs : le navigateur en tire le RATIO et réserve la
                    boîte avant chargement — anti-CLS. La vignette est plus
                    petite en pixels, seul le ratio compte ici. */}
                {/* `thumbUrl` est RELATIF (adapter disque A0) : sans
                    `mediaSrc`, le navigateur l'irait chercher sur l'origine de
                    Vite, pas sur l'API. Correctif A6a-P-①. */}
                <img
                  src={mediaSrc(photo.thumbUrl)}
                  alt={photo.altFr ?? ""}
                  width={photo.width}
                  height={photo.height}
                  style={{ inlineSize: "100%", blockSize: "auto", display: "block" }}
                />

                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {/* Le RANG, en clair. Une vignette dont l'alt n'est pas
                        encore saisi est décorative (`alt=""`, hors de l'arbre
                        d'accessibilité) : sans ce numéro, les tuiles seraient
                        indiscernables au lecteur d'écran et « avancer dans
                        l'ordre » n'aurait aucun référent. Un chiffre n'a pas
                        besoin de traduction. */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        minInlineSize: 20,
                        textAlign: "center",
                        padding: "2px 6px",
                        borderRadius: 999,
                        border: "1px solid var(--line)",
                        color: "var(--ink-2)"
                      }}
                    >
                      {index + 1}
                    </span>

                    {/* Couverture = PREMIÈRE par sortOrder, et le tableau EST
                        l'ordre (contrat du DTO). Le réordonnancement est donc
                        le sélecteur de couverture : pas de bouton dédié. */}
                    {index === 0 ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "var(--line)",
                          color: "var(--ink-2)"
                        }}
                      >
                        {t("venue.ui.photos.cover")}
                      </span>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {/* « Monter/descendre » ne décrit pas la position visuelle
                        en grille : les libellés disent le RANG, pas la
                        direction spatiale. */}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={t("venue.ui.photos.moveEarlier")}
                      title={t("venue.ui.photos.moveEarlier")}
                      onClick={() => void move(index, -1)}
                      disabled={mutating || index === 0}
                    >
                      <span aria-hidden="true">↑</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={t("venue.ui.photos.moveLater")}
                      title={t("venue.ui.photos.moveLater")}
                      onClick={() => void move(index, 1)}
                      disabled={mutating || index === photos.length - 1}
                    >
                      <span aria-hidden="true">↓</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => toggleAlt(photo)}
                      aria-expanded={altOpen}
                    >
                      {t("venue.ui.photos.altToggle")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => setConfirmingId(photo.id)}
                      disabled={mutating}
                    >
                      {t("venue.ui.photos.delete")}
                    </button>
                  </div>

                  {altOpen ? (
                    <div>
                      <div className="field">
                        <div className="field-head">
                          <label htmlFor={`${inputId}-fr-${photo.id}`}>{t("venue.ui.photos.altFr")}</label>
                        </div>
                        <textarea
                          id={`${inputId}-fr-${photo.id}`}
                          rows={2}
                          maxLength={300}
                          value={altDraft.altFr}
                          onChange={(e) => setAltDraft((current) => ({ ...current, altFr: e.target.value }))}
                          aria-invalid={altErrors.altFr ? true : undefined}
                        />
                        {altErrors.altFr ? (
                          <p className="field-error" role="alert">
                            {tval(altErrors.altFr)}
                          </p>
                        ) : null}
                      </div>

                      <div className="field">
                        <div className="field-head">
                          <label htmlFor={`${inputId}-ar-${photo.id}`}>{t("venue.ui.photos.altAr")}</label>
                        </div>
                        <textarea
                          id={`${inputId}-ar-${photo.id}`}
                          rows={2}
                          maxLength={300}
                          value={altDraft.altAr}
                          onChange={(e) => setAltDraft((current) => ({ ...current, altAr: e.target.value }))}
                          aria-invalid={altErrors.altAr ? true : undefined}
                        />
                        {altErrors.altAr ? (
                          <p className="field-error" role="alert">
                            {tval(altErrors.altAr)}
                          </p>
                        ) : null}
                      </div>

                      <p className="field-hint">{t("venue.ui.photos.altHint")}</p>

                      {/* Bouton explicite, jamais de save au blur : 300
                          caractères et deux langues méritent un acte. */}
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void saveAlt(photo.id)}
                        disabled={altSaving}
                      >
                        {altSaving ? t("venue.ui.photos.altSaving") : t("venue.ui.photos.altSave")}
                      </button>

                      {altError ? (
                        <p className="alert alert-error" role="alert">
                          {altError}
                        </p>
                      ) : null}
                      {altSaved ? (
                        <p className="alert alert-success" role="status">
                          {t("venue.ui.photos.altSaved")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmingId !== null}
        destructive
        title={t("venue.ui.photos.deleteTitle")}
        description={t("venue.ui.photos.deleteBody")}
        confirmLabel={t("venue.ui.photos.deleteConfirm")}
        cancelLabel={t("venue.ui.photos.deleteCancel")}
        onConfirm={() => {
          if (confirmingId) void confirmDelete(confirmingId);
        }}
        onCancel={() => setConfirmingId(null)}
      />
    </section>
  );
}
