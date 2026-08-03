"use client";

// Vue « Configuration du compte » (Client) — Lot A11b.
//
// Même structure qu'A11a côté Pro, avec les trois différences imposées par le
// modèle : pas de « Ajouter une salle », profil porté par `User`
// (`firstName`/`lastName`/`phone`, il n'y a PAS de `ProProfile`), et
// next-intl au lieu d'i18next.
//
// Les sections e-mail / mot de passe / suppression sont fonctionnellement
// identiques à celles du Pro. Elles ne sont pas factorisées dans `@zwadj/ui` :
// ce paquet est sans runtime i18n par contrat, et y remonter ces écrans
// imposerait de faire transiter une trentaine de libellés en props. La
// duplication réelle se limite au balisage — la logique, elle, vit dans
// `AccountClient` (partagé) et dans l'API.
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createAccountClient, type AccountClient } from "@zwadj/api-client";
import { BrandLoader, ConfirmDialog } from "@zwadj/ui";
import { changeEmailSchema, changePasswordSchema, profileUpdateSchema, type DeletionRequestDTO } from "@zwadj/types";
import { useAuth } from "../../lib/auth/auth-context";
import { validate, type FieldErrors } from "../../lib/auth/form-validation";
import { Field } from "../auth/auth-ui";
import { ApiError, NetworkError } from "../../lib/auth/auth-client";
import { Link } from "../../i18n/navigation";
import { BookingsSection } from "./bookings-section";
import { VisitBookingsSection } from "./visit-bookings-section";

function useSubmitError() {
  const t = useTranslations();
  return (e: unknown): string => {
    if (e instanceof ApiError && e.messageKey !== undefined) return t(e.messageKey);
    if (e instanceof NetworkError) return t("account.ui.errors.network");
    return t("account.ui.errors.generic");
  };
}

function Banner({ kind, text }: { kind: "ok" | "ko"; text: string }) {
  return (
    <p className={kind === "ok" ? "alert alert-success" : "alert alert-error"} role={kind === "ok" ? "status" : "alert"}>
      {text}
    </p>
  );
}

// ── Profil : porté par `User`, PAS par un ProProfile ────────────────────────
function ProfileSection({ client }: { client: AccountClient }) {
  const t = useTranslations();
  const { user, applyUser } = useAuth();
  const toMessage = useSubmitError();

  const [values, setValues] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? ""
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ kind: "ok" | "ko"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBanner(null);
    // Téléphone vide ⇒ `null` EXPLICITE : il est FACULTATIF à l'inscription
    // client, donc l'effacer est un geste légitime. `""` serait refusé par le
    // format +213 du schéma partagé.
    const checked = validate(profileUpdateSchema, {
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone.trim() === "" ? null : values.phone
    });
    if (checked.errors) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      applyUser(await client.updateProfile(checked.data));
      setBanner({ kind: "ok", text: t("account.ui.profile.saved") });
    } catch (e) {
      setBanner({ kind: "ko", text: toMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-section">
      <h2>{t("account.ui.profile.title")}</h2>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="field-row">
          <Field label={t("account.ui.profile.firstName")} required error={errors.firstName && t(errors.firstName)}>
            {({ id, describedBy, invalid, required }) => (
              <input
                id={id}
                type="text"
                autoComplete="given-name"
                value={values.firstName}
                onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required={required}
              />
            )}
          </Field>
          <Field label={t("account.ui.profile.lastName")} required error={errors.lastName && t(errors.lastName)}>
            {({ id, describedBy, invalid, required }) => (
              <input
                id={id}
                type="text"
                autoComplete="family-name"
                value={values.lastName}
                onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required={required}
              />
            )}
          </Field>
        </div>
        {/* Facultatif : pas de `required` — le téléphone l'est déjà à
            l'inscription client (correctif 7.2). */}
        <Field label={t("account.ui.profile.phoneOptional")} error={errors.phone && t(errors.phone)}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="ltr"
            />
          )}
        </Field>
        {banner ? <Banner kind={banner.kind} text={banner.text} /> : null}
        <button type="submit" className="btn btn-accent" disabled={busy}>
          {t("account.ui.save")}
        </button>
      </form>
    </section>
  );
}

// ── E-mail ──────────────────────────────────────────────────────────────────
function EmailSection({ client }: { client: AccountClient }) {
  const t = useTranslations();
  const { user } = useAuth();
  const toMessage = useSubmitError();

  const [newEmail, setNewEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const checked = validate(changeEmailSchema, { newEmail });
    if (checked.errors) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await client.changeEmail(checked.data);
      setPending(res.pendingEmail);
      setNewEmail("");
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-section">
      <h2>{t("account.ui.email.title")}</h2>
      <p className="account-hint">{t("account.ui.email.current", { email: user?.email ?? "" })}</p>
      {pending ? (
        <Banner kind="ok" text={t("account.ui.email.sent", { email: pending })} />
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field label={t("account.ui.email.newEmail")} required error={errors.newEmail && t(errors.newEmail)}>
            {({ id, describedBy, invalid, required }) => (
              <input
                id={id}
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required={required}
                dir="ltr"
              />
            )}
          </Field>
          {error ? <Banner kind="ko" text={error} /> : null}
          <button type="submit" className="btn btn-accent" disabled={busy}>
            {t("account.ui.email.submit")}
          </button>
        </form>
      )}
    </section>
  );
}

// ── Mot de passe (D42) — le cas Google-only est ICI le plus fréquent ────────
function PasswordSection({ client }: { client: AccountClient }) {
  const t = useTranslations();
  const { user, refreshUser } = useAuth();
  const toMessage = useSubmitError();

  // Côté Client, `hasPassword === false` n'est pas un cas limite : c'est
  // l'état de TOUT compte créé via « Continuer avec Google » (Lot 9).
  const hasPassword = user?.hasPassword ?? true;

  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ kind: "ok" | "ko"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBanner(null);
    if (values.next !== values.confirm) {
      setErrors({ confirm: "account.validation.passwordMismatch" });
      return;
    }
    const checked = validate(changePasswordSchema, {
      newPassword: values.next,
      ...(hasPassword ? { currentPassword: values.current } : {})
    });
    if (checked.errors) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await client.changePassword(checked.data);
      const wasDefining = !hasPassword;
      // Réhydratation OBLIGATOIRE : la réponse ne porte pas le DTO, donc sans
      // elle `hasPassword` resterait `false` et l'écran resterait en mode
      // « définir » alors que le mot de passe vient d'être posé.
      await refreshUser();
      setValues({ current: "", next: "", confirm: "" });
      setBanner({
        kind: "ok",
        text: wasDefining ? t("account.ui.password.defined") : t("account.ui.password.changed")
      });
    } catch (e) {
      setBanner({ kind: "ko", text: toMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-section">
      <h2>{hasPassword ? t("account.ui.password.titleChange") : t("account.ui.password.titleDefine")}</h2>
      {hasPassword ? null : <p className="account-hint">{t("account.ui.password.defineHint")}</p>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {/* AUCUN champ « ancien mot de passe » quand il n'en existe pas (D42). */}
        {hasPassword ? (
          <Field
            label={t("account.ui.password.current")}
            required
            error={errors.currentPassword && t(errors.currentPassword)}
          >
            {({ id, describedBy, invalid, required }) => (
              <input
                id={id}
                type="password"
                autoComplete="current-password"
                value={values.current}
                onChange={(e) => setValues((v) => ({ ...v, current: e.target.value }))}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required={required}
              />
            )}
          </Field>
        ) : null}
        <Field label={t("account.ui.password.next")} required error={errors.newPassword && t(errors.newPassword)}>
          {({ id, describedBy, invalid, required }) => (
            <input
              id={id}
              type="password"
              autoComplete="new-password"
              value={values.next}
              onChange={(e) => setValues((v) => ({ ...v, next: e.target.value }))}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required={required}
            />
          )}
        </Field>
        <Field label={t("account.ui.password.confirm")} required error={errors.confirm && t(errors.confirm)}>
          {({ id, describedBy, invalid, required }) => (
            <input
              id={id}
              type="password"
              autoComplete="new-password"
              value={values.confirm}
              onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required={required}
            />
          )}
        </Field>
        {banner ? <Banner kind={banner.kind} text={banner.text} /> : null}
        <button type="submit" className="btn btn-accent" disabled={busy}>
          {hasPassword ? t("account.ui.password.submitChange") : t("account.ui.password.submitDefine")}
        </button>
      </form>
    </section>
  );
}

// ── Suppression (D37 + D41, trois états) ───────────────────────────────────
function DeletionSection({ client }: { client: AccountClient }) {
  const t = useTranslations();
  const toMessage = useSubmitError();

  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<DeletionRequestDTO | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void client
      .getDeletionRequest()
      .then((res) => {
        if (cancelled) return;
        setCurrent(res);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  async function run(action: () => Promise<DeletionRequestDTO>) {
    setError(null);
    setBusy(true);
    try {
      setCurrent(await action());
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const pending = current?.status === "PENDING";
  const rejected = current?.status === "REJECTED";

  return (
    <section className="account-section is-danger">
      <h2>{t("account.ui.deletion.title")}</h2>

      {loading ? (
        <p className="account-hint">{t("common.loading")}</p>
      ) : loadFailed ? (
        <Banner kind="ko" text={t("account.ui.deletion.loadFailed")} />
      ) : pending ? (
        <>
          <Banner
            kind="ok"
            text={t("account.ui.deletion.pending", { date: new Date(current.requestedAt).toLocaleDateString() })}
          />
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => void run(() => client.cancelDeletion())}
          >
            {t("account.ui.deletion.cancel")}
          </button>
        </>
      ) : (
        <>
          {rejected ? (
            <Banner
              kind="ko"
              text={
                current.decisionNote
                  ? t("account.ui.deletion.rejectedWithNote", { note: current.decisionNote })
                  : t("account.ui.deletion.rejected")
              }
            />
          ) : null}
          <p className="account-hint">{t("account.ui.deletion.consequences")}</p>
          {/* PAS de promesse d'archivage ici : un client n'a pas de salle.
              Afficher « vos salles sont conservées » à quelqu'un qui n'en a
              jamais eu serait incompréhensible. */}
          <Field label={t("account.ui.deletion.reason")}>
            {({ id, describedBy }) => (
              <textarea
                id={id}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-describedby={describedBy}
              />
            )}
          </Field>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setConfirming(true)}>
            {t("account.ui.deletion.submit")}
          </button>
        </>
      )}

      {error ? <Banner kind="ko" text={error} /> : null}

      <ConfirmDialog
        open={confirming}
        title={t("account.ui.deletion.confirmTitle")}
        description={t("account.ui.deletion.confirmBody")}
        confirmLabel={t("account.ui.deletion.confirmCta")}
        cancelLabel={t("account.ui.cancel")}
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void run(() => client.requestDeletion(reason.trim() === "" ? undefined : reason.trim()));
        }}
      />
    </section>
  );
}

export function AccountSettingsView({ client }: { client?: AccountClient }) {
  const t = useTranslations();
  const { status, api } = useAuth();
  const accountClient = useMemo(() => client ?? createAccountClient(api.authedRequest), [client, api]);

  // Garde CÔTÉ CLIENT, et pas dans le middleware Next : l'access token vit en
  // mémoire JS (D2) et le cookie refresh est restreint au path /api/v1/auth —
  // le middleware ne voit donc AUCUN signal de session et ne peut rien
  // décider. C'est la première page protégée du site client ; le point est
  // noté au backlog 9.1, qui supposait à tort une protection par middleware.
  if (status === "loading") return <BrandLoader label={t("common.loading")} />;
  if (status === "anonymous") {
    return (
      <main className="account-main">
        <h1>{t("account.ui.title")}</h1>
        <p className="account-hint">{t("account.ui.signedOut")}</p>
        <Link href="/auth/connexion" className="btn btn-accent">
          {t("auth.ui.header.login")}
        </Link>
      </main>
    );
  }

  return (
    <main className="account-main">
      <h1>{t("account.ui.title")}</h1>
      {/* C5b — « Mes rendez-vous » en PREMIER : c'est du contenu, tout le reste
          de la page est du réglage. Elle porte sa propre garde de forme et son
          propre message d'erreur ; une section qui échoue doit échouer SEULE,
          sans emporter le profil, l'e-mail et le mot de passe. */}
      {/* E1b — « Mes réservations » AVANT les rendez-vous de visite : une demande
          en attente est ce que le client vient vérifier ; une visite est déjà
          confirmée et n'appelle aucune action. */}
      <BookingsSection />
      <VisitBookingsSection />
      <ProfileSection client={accountClient} />
      <EmailSection client={accountClient} />
      <PasswordSection client={accountClient} />
      <DeletionSection client={accountClient} />
    </main>
  );
}
