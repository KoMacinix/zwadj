// Édition d'une salle, PAR ID (le slug est public-only, §4).
// Lot A6a / D45 : la visite virtuelle est branchée ici, en SECTION AUTONOME
// (endpoint séparé, corps différent du PATCH général). Lot A6a-P : le volet
// PHOTOS l'est aussi, au même endroit et pour la même raison — quatre endpoints
// à lui, donc ses propres boutons, HORS du <form>. Il possède son état et ne
// rappelle jamais `load()` : cf. l'en-tête de `photos-section.tsx`.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowBackIcon, ConfirmDialog } from "@zwadj/ui";
import type { FieldErrors } from "@zwadj/api-client";
import type { VenueProDTO } from "@zwadj/types";
import { ProHeader } from "../shell/pro-header";
import { Field, FormError, useApiErrorMessage, useValidationMessage } from "../auth/auth-ui";
import { useReferentialsData, useVenueCrud } from "./venue-client-context";
import { isVenueNotFound, venueFieldErrors } from "./venue-errors";
import {
  AmenitiesPicker,
  BookingModeField,
  CapacityPriceFields,
  CityField,
  NameFields,
  PlaceFields,
  PresentationFields,
  StylesPicker,
  PublicationBadge,
  StatusSelect,
  buildCreateInput,
  buildUpdateDiff,
  liveErrors,
  venueToForm,
  type VenueFormValues
} from "./venue-form";
import { VenueWizard, type WizardStep } from "./venue-wizard";
import { PhotosSection } from "./photos-section";
import { SlotsSection } from "./slots-section";
import { BlocksSection } from "./blocks-section";
import { GuardedSection } from "./guarded-section";
import { DepositSection } from "./deposit-section";
import { ServicesSection } from "./services-section";
import { VirtualTourSection } from "./virtual-tour-section";

type LoadState =
  | { kind: "loading" }
  /** 404 INDISTINCT : inexistante, supprimée, id malformé, salle d'un autre
   *  pro — un seul et même état, aucune distinction (anti-énumération). */
  | { kind: "notFound" }
  | { kind: "error" }
  | { kind: "ready"; venue: VenueProDTO };

export function EditVenuePage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const venuesApi = useVenueCrud();
  const apiErrorMessage = useApiErrorMessage();
  const tval = useValidationMessage();
  const referentials = useReferentialsData();

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [values, setValues] = useState<VenueFormValues | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** ⚠ L'étape vit dans l'URL, pas dans un `useState`. Rechargement, bouton
   *  « retour » et adressabilité pour la suite a11y viennent alors gratuitement. */
  const [params, setParams] = useSearchParams();
  const current = Math.max(1, Math.min(7, Number(params.get("etape") ?? "1") || 1));
  const goStep = (n: number) => setParams({ etape: String(n) }, { replace: false });

  const load = useCallback(() => {
    setState({ kind: "loading" });
    venuesApi
      .getMine(id)
      .then((venue) => {
        setState({ kind: "ready", venue });
        setValues(venueToForm(venue));
      })
      .catch((err: unknown) => setState({ kind: isVenueNotFound(err) ? "notFound" : "error" }));
  }, [venuesApi, id]);

  useEffect(() => load(), [load]);

  const patch = (next: Partial<VenueFormValues>) =>
    setValues((current) => (current ? { ...current, ...next } : current));

  /** Enregistre les champs du formulaire général PUIS avance (ou reste, si
   *  `next` est nul).
   *
   *  ⚠ Un diff VIDE n'est plus une anomalie à signaler. Sur une page unique,
   *  « aucun changement » répondait à un clic sur « Enregistrer » ; dans un
   *  assistant, traverser une étape sans rien y toucher est le cas NORMAL —
   *  afficher un avertissement à chaque « Suivant » apprendrait à ne plus lire
   *  les messages. On n'envoie toujours rien (corps vide = 400 côté schéma), on
   *  avance simplement. */
  const saveAndGo = async (next: number | null) => {
    setFormError(null);
    setNotice(null);
    if (state.kind !== "ready" || !values || referentials.status !== "ready") return;

    const diff = buildUpdateDiff(values, state.venue);
    if (diff.kind === "errors") {
      setFieldErrors(diff.errors);
      return;
    }
    if (diff.kind === "empty") {
      setFieldErrors({});
      if (next !== null) goStep(next);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      const updated = await venuesApi.update(state.venue.id, diff.data);
      setState({ kind: "ready", venue: updated });
      setValues(venueToForm(updated));
      setNotice(t("venue.ui.form.saved"));
      if (next !== null) goStep(next);
    } catch (err) {
      if (isVenueNotFound(err)) {
        setState({ kind: "notFound" });
        return;
      }
      // Les 400 que le validate() local ne POUVAIT pas voir (existence d'un
      // référentiel : commune, équipements) atterrissent ici, sur leur champ.
      const mapped = venueFieldErrors(err);
      if (mapped) setFieldErrors(mapped);
      else setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (state.kind !== "ready") return;
    setConfirmingDelete(false);
    try {
      await venuesApi.softDelete(state.venue.id);
      void navigate("/salles");
    } catch {
      setFormError(t("venue.ui.delete.error"));
    }
  };

  if (state.kind === "loading") {
    return (
      <>
        <ProHeader />
        <main style={{ padding: 20, maxInlineSize: 720, marginInline: "auto" }} aria-busy="true">
          <p style={{ color: "var(--ink-2)" }}>{t("venue.ui.list.loading")}</p>
        </main>
      </>
    );
  }

  if (state.kind === "notFound") {
    return (
      <>
        <ProHeader />
        <main style={{ padding: 20, maxInlineSize: 720, marginInline: "auto" }}>
          <div className="state-panel">
            <h1>{t("venue.ui.notFound.title")}</h1>
            <p>{t("venue.ui.notFound.body")}</p>
            {/* ⚠ `/salles` : l'écran « salle introuvable » renvoyait sur « / »,
                devenu le tableau de bord depuis UIP-A. Le troisième lien de ce
                fichier à corriger — l'audit du zip les a comptés, pas moi. */}
            <Link to="/salles" className="btn btn-accent">
              <ArrowBackIcon />
              {t("venue.ui.notFound.back")}
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (state.kind === "error" || !values) {
    return (
      <>
        <ProHeader />
        <main style={{ padding: 20, maxInlineSize: 720, marginInline: "auto" }}>
          <div className="state-panel">
            <p className="alert alert-error" role="alert">
              {t("venue.ui.form.loadError")}
            </p>
            <button type="button" className="btn btn-accent" onClick={load}>
              {t("venue.ui.list.retry")}
            </button>
          </div>
        </main>
      </>
    );
  }

  const venue = state.venue;
  /** ⚠ La validité de l'étape 1 EST le contrat de CRÉATION, même à l'édition :
   *  ce sont les cinq champs sans lesquels une salle ne peut pas exister. Une
   *  salle enregistrée les satisfait par construction ; ce test n'est là que pour
   *  empêcher de les VIDER et d'avancer quand même. D55 — aucune borne nouvelle. */
  const controle = buildCreateInput(values);
  const step1Valid = controle.errors === null;
  const erreursVues = { ...liveErrors(controle.errors ?? {}, values), ...fieldErrors };
  const groupe = { values, onChange: patch, errors: erreursVues };

  /** ⚠ « Franchissable » ≠ « déjà visitée ». À l'édition, la salle existe donc
   *  l'étape 1 est satisfaite : toutes les étapes sont ouvertes, et le pro qui
   *  vient corriger une photo n'a pas à retraverser six écrans. Elles se ferment
   *  toutes si l'étape 1 cesse d'être valide — avancer sur une salle dont on
   *  vient d'effacer le prix produirait des PATCH voués au 400. */
  const ouverte = step1Valid;

  const etapes: WizardStep[] = [
    {
      n: 1,
      title: t("venue.ui.wizard.step1"),
      valid: step1Valid,
      reachable: true,
      body: (
        <>
          {/* Slug : figé à la création, généré serveur — lecture seule. */}
          <Field label={t("venue.ui.form.slug")} hint={t("venue.ui.form.slugHint")}>
            {({ id: slugId, describedBy }) => (
              <input id={slugId} type="text" value={venue.slug} readOnly dir="ltr" aria-describedby={describedBy} />
            )}
          </Field>
          <NameFields {...groupe} />
          <CityField
            {...groupe}
            wilayas={referentials.wilayas}
            referentialsLoading={referentials.status === "loading"}
          />
          <CapacityPriceFields {...groupe} />
        </>
      )
    },
    {
      n: 2,
      title: t("venue.ui.wizard.step2"),
      valid: true,
      reachable: ouverte,
      body: <PlaceFields {...groupe} />
    },
    {
      n: 3,
      title: t("venue.ui.wizard.step3"),
      valid: true,
      reachable: ouverte,
      body: (
        <>
          <PresentationFields {...groupe} />
          <AmenitiesPicker
            amenities={referentials.amenities}
            selected={values.amenityIds}
            loading={referentials.status === "loading"}
            error={tval(fieldErrors.amenityIds)}
            onToggle={(amenityId, checked) =>
              patch({
                amenityIds: checked
                  ? [...values.amenityIds, amenityId]
                  : values.amenityIds.filter((c) => c !== amenityId)
              })
            }
          />
          <StylesPicker
            venueStyles={referentials.venueStyles}
            selectedStyles={values.styleIds}
            loading={referentials.status === "loading"}
            ceremonyType={values.ceremonyType}
            onCeremonyType={(ceremonyType) => patch({ ceremonyType })}
            onToggleStyle={(styleId, checked) =>
              patch({
                styleIds: checked ? [...values.styleIds, styleId] : values.styleIds.filter((c) => c !== styleId)
              })
            }
          />
        </>
      )
    },
    {
      n: 4,
      title: t("venue.ui.wizard.step4"),
      valid: true,
      reachable: ouverte,
      body: (
        <>
          <BookingModeField {...groupe} />
          {/* B4b — `initialSlots` consommé UNE FOIS, pas de `key` : la section ne
              doit pas se remonter au milieu d'une saisie. */}
          <SlotsSection venueId={venue.id} initialSlots={venue.slotTemplates} />
          {/* D81 — l'acompte suit les créneaux et leurs prix : c'est la même
              conversation commerciale. */}
          <DepositSection
            venue={venue}
            onApplied={(deposit) =>
              setState((c) => (c.kind === "ready" ? { ...c, venue: { ...c.venue, ...deposit } } : c))
            }
          />
          <GuardedSection title={t("venue.ui.blocks.section")}>
            <BlocksSection venueId={venue.id} />
          </GuardedSection>
        </>
      )
    },
    {
      n: 5,
      title: t("venue.ui.wizard.step5"),
      valid: true,
      reachable: ouverte,
      body: (
        <GuardedSection title={t("venue.ui.services.title")}>
          <ServicesSection venueId={venue.id} />
        </GuardedSection>
      )
    },
    {
      n: 6,
      title: t("venue.ui.wizard.step6"),
      valid: true,
      reachable: ouverte,
      body: (
        <>
          <PhotosSection venueId={venue.id} initialPhotos={venue.photos} />
          <VirtualTourSection
            venueId={venue.id}
            modelId={venue.matterportModelId}
            onApplied={(matterportModelId) =>
              setState((c) => (c.kind === "ready" ? { ...c, venue: { ...c.venue, matterportModelId } } : c))
            }
          />
        </>
      )
    },
    {
      n: 7,
      title: t("venue.ui.wizard.step7"),
      valid: true,
      reachable: ouverte,
      body: (
        <>
          {/* D33 — même contrôle à 3 entrées que sur la liste. */}
          <Field label={t("venue.ui.status.label")} hint={t("venue.ui.status.hint")} error={tval(fieldErrors.status)}>
            {({ id: statusId, describedBy }) => (
              <StatusSelect
                id={statusId}
                value={values.status}
                describedBy={describedBy}
                onChange={(status) => patch({ status })}
              />
            )}
          </Field>
          <p className="field-hint">{t("venue.ui.wizard.publishHint")}</p>
        </>
      )
    }
  ];

  return (
    <>
      <ProHeader />
      <main style={{ padding: 20, maxInlineSize: 720, marginInline: "auto" }}>
        <Link to="/salles" className="backlink">
          <ArrowBackIcon />
          {t("venue.ui.form.back")}
        </Link>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20 }}>
          <h1>{t("venue.ui.form.editTitle")}</h1>
          <FormError message={formError} />
          {notice ? (
            <p className="alert alert-success" role="status">
              {notice}
            </p>
          ) : null}

          {referentials.status === "error" ? (
            <div className="alert alert-error" role="alert">
              <p style={{ margin: "0 0 8px" }}>{t("venue.ui.form.referentialsError")}</p>
              <button type="button" className="btn btn-ghost" onClick={referentials.reload}>
                {t("venue.ui.list.retry")}
              </button>
            </div>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <PublicationBadge status={venue.publicationStatus} />
          </div>

          {/* ⚠ AUCUN <form> ici, et ce n'est pas une négligence. Les étapes 4 à 7
              montent des sections qui possèdent DÉJÀ leurs propres boutons et
              leurs propres endpoints (créneaux, prestations, acompte, blocages,
              photos, visite virtuelle). Imbriquer un submit dans un autre est
              invalide en HTML et ferait partir deux requêtes sur une touche
              Entrée — c'était déjà la raison de les sortir du formulaire sur la
              page unique. L'assistant remplace le submit par « Suivant », qui
              enregistre le diff du formulaire général puis avance. */}
          <VenueWizard
            steps={etapes}
            current={current}
            onGo={(n) => void saveAndGo(n)}
            onNext={() => void saveAndGo(current === etapes.length ? null : current + 1)}
            nextLabel={
              saving
                ? t("venue.ui.form.saving")
                : current === etapes.length
                  ? t("venue.ui.form.save")
                  : t("venue.ui.wizard.next")
            }
            busy={saving}
            invalidHint={t("venue.ui.wizard.step1Invalid")}
          />
        </div>

        {/* Lot UI-P1 — sortie de page EXPLICITE, à la toute fin : l'écran
            d'édition ne s'arrête pas au formulaire (photos et visite virtuelle
            suivent, avec leurs propres boutons). Le lien discret du haut reste,
            il sert la navigation ; celui-ci clôt la tâche. */}
        <div style={{ marginBlockStart: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {/* B6 — accès au calendrier de la salle, en lecture. */}
          <Link to={`/salles/${state.venue.id}/calendrier`} className="btn">
            {t("venue.ui.calendar.title")}
          </Link>
          {/* ⚠ `/salles` et non `/` : depuis UIP-A, « / » est le tableau de bord.
              Un lien nommé « Retour à mes salles » qui ouvre autre chose est un
              mensonge de libellé. */}
          <Link to="/salles" className="btn">
            <ArrowBackIcon />
            {t("venue.ui.form.back")}
          </Link>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
            {t("venue.ui.list.delete")}
          </button>
        </div>
      </main>

      <ConfirmDialog
        open={confirmingDelete}
        destructive
        title={t("venue.ui.delete.title")}
        description={t("venue.ui.delete.body")}
        confirmLabel={t("venue.ui.delete.confirm")}
        cancelLabel={t("venue.ui.delete.cancel")}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
