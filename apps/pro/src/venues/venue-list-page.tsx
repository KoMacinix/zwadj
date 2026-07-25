// Liste des salles du pro — l'ACCUEIL RÉEL de l'app (le placeholder D24 a
// disparu, §3.1). Tableau simple trié `updatedAt` desc côté API, SANS
// pagination : un pro a 1 à 3 salles, en paginer serait du décor.
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ConfirmDialog } from "@zwadj/ui";
import { formatDZD } from "@zwadj/i18n";
import type { VenueAvailabilityStatus, VenueProDTO } from "@zwadj/types";
import { ProHeader } from "../shell/pro-header";
import { useApiErrorMessage } from "../auth/auth-ui";
import { useReferentialsData, useVenues } from "./venue-client-context";
import { PublicationBadge, StatusSelect } from "./venue-form";

type ListState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; venues: VenueProDTO[] };

export function VenueListPage() {
  const { t, i18n } = useTranslation();
  const venuesApi = useVenues();
  const apiErrorMessage = useApiErrorMessage();
  const isAr = i18n.language === "ar";
  const locale = isAr ? "ar" : "fr";

  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [pendingDelete, setPendingDelete] = useState<VenueProDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // La commune vient du référentiel public. Son échec n'est PAS bloquant ici :
  // une salle reste parfaitement lisible et actionnable sans son libellé de
  // commune (le blocage, lui, appartient aux écrans de formulaire — ajout B).
  const { cityById } = useReferentialsData();

  const load = useCallback(() => {
    setState({ kind: "loading" });
    venuesApi
      .listMine()
      .then((venues) => setState({ kind: "ready", venues }))
      .catch(() => setState({ kind: "error" }));
  }, [venuesApi]);

  useEffect(() => load(), [load]);

  /**
   * D33 — bascule OPTIMISTE avec revert. Aucune confirmation : le changement
   * est réversible et ne repasse pas par la modération. En cas d'échec, on
   * remet l'ancienne valeur ET on le dit (sinon le pro croit sa salle masquée
   * alors qu'elle est toujours visible en ligne).
   */
  const changeStatus = async (venue: VenueProDTO, next: VenueAvailabilityStatus) => {
    const previous = venue.status;
    setActionError(null);
    setState((current) =>
      current.kind === "ready"
        ? { kind: "ready", venues: current.venues.map((v) => (v.id === venue.id ? { ...v, status: next } : v)) }
        : current
    );
    try {
      await venuesApi.update(venue.id, { status: next });
    } catch {
      setState((current) =>
        current.kind === "ready"
          ? { kind: "ready", venues: current.venues.map((v) => (v.id === venue.id ? { ...v, status: previous } : v)) }
          : current
      );
      setActionError(t("venue.ui.status.updateError"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setActionError(null);
    try {
      await venuesApi.softDelete(target.id);
      load(); // rechargement : la salle supprimée est désormais un 404
    } catch (err) {
      setActionError(err instanceof Error ? t("venue.ui.delete.error") : apiErrorMessage(err));
    }
  };

  return (
    <>
      <ProHeader />
      <main style={{ padding: 20, maxInlineSize: 1080, marginInline: "auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBlockEnd: 18
          }}
        >
          <h1 style={{ fontWeight: 500, fontSize: 24, margin: 0 }}>{t("venue.ui.list.title")}</h1>
          {/* Aligné inline-end : correct en RTL sans conditionnel. */}
          <Link to="/salles/nouvelle" className="btn btn-accent">
            {t("venue.ui.list.new")}
          </Link>
        </div>

        {actionError ? (
          <p className="alert alert-error" role="alert" style={{ marginBlockEnd: 14 }}>
            {actionError}
          </p>
        ) : null}

        {state.kind === "loading" ? (
          <p aria-busy="true" style={{ color: "var(--ink-2)" }}>
            {t("venue.ui.list.loading")}
          </p>
        ) : null}

        {state.kind === "error" ? (
          <div className="state-panel">
            <p className="alert alert-error" role="alert">
              {t("venue.ui.list.loadError")}
            </p>
            <button type="button" className="btn btn-accent" onClick={load}>
              {t("venue.ui.list.retry")}
            </button>
          </div>
        ) : null}

        {state.kind === "ready" && state.venues.length === 0 ? (
          <div className="state-panel">
            <h2>{t("venue.ui.list.empty.title")}</h2>
            <p>{t("venue.ui.list.empty.body")}</p>
            <Link to="/salles/nouvelle" className="btn btn-accent">
              {t("venue.ui.list.empty.cta")}
            </Link>
          </div>
        ) : null}

        {state.kind === "ready" && state.venues.length > 0 ? (
          // `auto-fill minmax` : 1 colonne sur mobile, 2–3 au-delà, sans media
          // query ni propriété physique.
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              listStyle: "none",
              margin: 0,
              padding: 0
            }}
          >
            {state.venues.map((venue) => {
              const city = cityById.get(venue.cityId);
              const cover = venue.photos[0]?.thumbUrl;
              return (
                <li
                  key={venue.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    overflow: "hidden"
                  }}
                >
                  {/* Couverture = 1ʳᵉ photo par sortOrder (règle A4). AUCUNE
                      gestion de média ici : ni upload, ni ordre, ni alt — A6a. */}
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      style={{ inlineSize: "100%", blockSize: 150, objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        blockSize: 150,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--bg-2)",
                        color: "var(--ink-mute)",
                        fontSize: 12.5
                      }}
                    >
                      {t("venue.ui.list.noPhoto")}
                    </div>
                  )}

                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{isAr ? venue.nameAr : venue.nameFr}</h2>
                    {city ? (
                      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>{isAr ? city.nameAr : city.nameFr}</p>
                    ) : null}
                    <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>
                      {t("venue.ui.list.capacity", { max: venue.capacityMax })}
                    </p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{formatDZD(venue.basePriceCents, locale)}</p>

                    <div style={{ marginBlockStart: "auto", paddingBlockStart: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                      <PublicationBadge status={venue.publicationStatus} />

                      <div className="field" style={{ gap: 4 }}>
                        <label htmlFor={`status-${venue.id}`} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-2)" }}>
                          {t("venue.ui.status.label")}
                        </label>
                        <StatusSelect
                          id={`status-${venue.id}`}
                          value={venue.status}
                          onChange={(next) => void changeStatus(venue, next)}
                        />
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <Link to={`/salles/${venue.id}`} className="btn btn-ghost">
                          {t("venue.ui.list.edit")}
                        </Link>
                        <button type="button" className="btn btn-danger" onClick={() => setPendingDelete(venue)}>
                          {t("venue.ui.list.delete")}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        destructive
        title={t("venue.ui.delete.title")}
        description={t("venue.ui.delete.body")}
        confirmLabel={t("venue.ui.delete.confirm")}
        cancelLabel={t("venue.ui.delete.cancel")}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
