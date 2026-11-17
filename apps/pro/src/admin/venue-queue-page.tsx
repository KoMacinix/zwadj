// ADM-2 (D350, rang 52, R-5 écran 1) — la file des salles en attente de validation : ce que l'ADMIN lit avant de décider (D-6, l2 : les brouillons vivants qui ont au moins un créneau actif ; les salles déjà
// rejetées sont rangées APRÈS les autres, avec leur motif et leur date).
//
// ⛔ MD-ADM-15 / D217 : une PANNE n'est jamais « aucune salle en attente » — l'erreur a son état, son alerte, son bouton de relecture. ⛔ D212 : la pagination suit l'ÉCHO du serveur (`page`, `pageSize`,
// `total`), jamais ce que le client croit avoir demandé. ⛔ D120 : une réponse malformée est une erreur, jamais un rendu cassé. La page vit dans l'adresse (`?page=2`) : rechargement et retour arrière
// la retrouvent.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { VenuePendingItemDTO, VenuePendingPageDTO } from "@zwadj/types";
import { ADMIN_PATH, adminVenuePath } from "../routes";
import { useAdminClient } from "./admin-client-context";
import { ADMIN_TEXTS, classifyAdminError, formatAdminDate } from "./admin-texts";

type State = { kind: "loading" } | { kind: "error"; rights: boolean } | { kind: "ready"; data: VenuePendingPageDTO };

function pageOf(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** D120 : la forme minimale que l'écran sait rendre. Autre chose est une panne, pas un tableau vide. */
function isPage(data: unknown): data is VenuePendingPageDTO {
  const d = data as Partial<VenuePendingPageDTO> | null;
  return d !== null && typeof d === "object" && Array.isArray(d.items) && typeof d.total === "number" && typeof d.page === "number" && typeof d.pageSize === "number" && d.pageSize >= 1;
}

export function VenueQueuePage() {
  const admin = useAdminClient();
  const [params, setParams] = useSearchParams();
  const page = pageOf(params.get("page"));
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    admin
      .listPendingVenues({ page })
      .then((data) => {
        if (!cancelled) setState(isPage(data) ? { kind: "ready", data } : { kind: "error", rights: false });
      })
      .catch((err: unknown) => {
        // Les droits (401, 403) ont leur texte : une session expirée n'est pas « la liste n'a pas pu être chargée ».
        if (!cancelled) setState({ kind: "error", rights: classifyAdminError(err).kind === "rights" });
      });
    return () => {
      cancelled = true;
    };
  }, [admin, page, attempt]);

  const goTo = (target: number) => setParams(target <= 1 ? {} : { page: String(target) });

  return (
    <section>
      <h1>{ADMIN_TEXTS.queue.title}</h1>
      <p className="admin-hint">{ADMIN_TEXTS.queue.intro}</p>

      {state.kind === "loading" ? <p role="status">{ADMIN_TEXTS.common.loading}</p> : null}

      {state.kind === "error" ? (
        <div className="alert alert-error" role="alert">
          <p>{state.rights ? ADMIN_TEXTS.errors.rights : ADMIN_TEXTS.queue.loadError}</p>
          <button type="button" className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
            {ADMIN_TEXTS.common.retry}
          </button>
        </div>
      ) : null}

      {state.kind === "ready" ? <Ready data={state.data} onPage={goTo} /> : null}
    </section>
  );
}

function Ready({ data, onPage }: { data: VenuePendingPageDTO; onPage: (page: number) => void }) {
  if (data.total === 0) return <p>{ADMIN_TEXTS.queue.empty}</p>;
  if (data.items.length === 0) {
    // La page demandée est au-delà de la fin : la liste a rétréci. Jamais un retour silencieux au début.
    return (
      <p>
        {ADMIN_TEXTS.queue.pageGone} <Link to={ADMIN_PATH}>{ADMIN_TEXTS.queue.pagination.backToFirst}</Link>
      </p>
    );
  }
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <>
      <p>{ADMIN_TEXTS.queue.total(data.total)}</p>
      <ol className="admin-list">
        {data.items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </ol>
      {totalPages > 1 ? (
        <nav className="admin-pagination" aria-label={ADMIN_TEXTS.queue.pagination.label}>
          <button type="button" className="btn btn-ghost" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>
            {ADMIN_TEXTS.queue.pagination.previous}
          </button>
          <span>{ADMIN_TEXTS.queue.pagination.page(data.page, totalPages)}</span>
          <button type="button" className="btn btn-ghost" disabled={data.page >= totalPages} onClick={() => onPage(data.page + 1)}>
            {ADMIN_TEXTS.queue.pagination.next}
          </button>
        </nav>
      ) : null}
    </>
  );
}

function Item({ item }: { item: VenuePendingItemDTO }) {
  return (
    <li className="admin-card">
      <h2>
        <Link to={adminVenuePath(item.id)}>{item.nameFr}</Link>
      </h2>
      <p lang="ar" dir="rtl">
        {item.nameAr}
      </p>
      <p className="admin-meta">
        <span>{ADMIN_TEXTS.queue.number(item.number)}</span>
        <span>{item.cityNameFr}</span>
        <span>{item.ownerBusinessName}</span>
        <span>{ADMIN_TEXTS.queue.slots(item.activeSlotCount)}</span>
      </p>
      {item.rejection ? (
        <div className="admin-rejected">
          <p>
            <span className="admin-badge">{ADMIN_TEXTS.queue.rejectedBadge}</span>
            {item.rejection.rejectedAt ? <span>{` ${ADMIN_TEXTS.queue.rejectedOnLabel} ${formatAdminDate(item.rejection.rejectedAt)}`}</span> : null}
          </p>
          <p>
            <strong>{ADMIN_TEXTS.queue.rejectedReasonLabel}</strong> <span dir="auto">{item.rejection.reason}</span>
          </p>
        </div>
      ) : null}
    </li>
  );
}
