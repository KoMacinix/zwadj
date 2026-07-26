// Page « Configuration du compte » (Pro) — Lot A11a.
//
// Quatre sections indépendantes, chacune avec son propre état de soumission :
// une erreur sur le changement d'e-mail ne doit pas effacer un profil en cours
// de saisie. C'est la raison du découpage en sous-composants.
//
// D32 partout : `required` NATIF sur l'input, astérisque `aria-hidden` hors du
// `<label>` (porté par `Field`), `noValidate` sur le `<form>`, erreurs Zod
// localisées. Propriétés CSS logiques uniquement (RTL).
//
// Le client est injectable par prop — simplification assumée face au
// `VenueProvider` d'A5 : il n'y a qu'UN consommateur. Le défaut est construit
// sur `api.authedRequest`, donc partage le mutex single-flight du refresh.
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createAccountClient, validate, type AccountClient, type FieldErrors } from "@zwadj/api-client";
import { ConfirmDialog } from "@zwadj/ui";
import { changeEmailSchema, changePasswordSchema, profileUpdateSchema, type DeletionRequestDTO } from "@zwadj/types";
import { useAuth } from "../auth/auth-context";
import { Field } from "../auth/auth-ui";
import { ApiError, NetworkError } from "../lib/auth-client";
import { ProHeader } from "../shell/pro-header";

/** Traduit une clé i18n de champ, ou rien. */
function useFieldError() {
  const { t } = useTranslation();
  return (key: string | undefined) => (key === undefined ? undefined : t(key));
}

/**
 * Message d'une soumission échouée. `ApiError` porte une clé i18n dans
 * `messageKey` — on la traduit ; `NetworkError` n'en a pas. Tout le reste
 * tombe sur le libellé générique plutôt que de laisser une exception nue
 * casser l'écran.
 */
function useSubmitError() {
  const { t } = useTranslation();
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

// ── Section 1 : profil ───────────────────────────────────────────────────────
function ProfileSection({ client }: { client: AccountClient }) {
  const { t } = useTranslation();
  const { user, applyUser } = useAuth();
  const tval = useFieldError();
  const toMessage = useSubmitError();

  const [values, setValues] = useState({
    businessName: user?.proProfile?.businessName ?? "",
    phone: user?.proProfile?.phone ?? "",
    phone2: user?.proProfile?.phone2 ?? ""
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ kind: "ok" | "ko"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBanner(null);
    // `phone2` vide ⇒ `null` EXPLICITE : c'est un effacement demandé (D38,
    // colonne nullable), pas une absence de modification. Envoyer `""` serait
    // refusé par le format +213 du schéma partagé.
    const checked = validate(profileUpdateSchema, {
      businessName: values.businessName,
      phone: values.phone,
      phone2: values.phone2.trim() === "" ? null : values.phone2
    });
    if (checked.errors) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      // L'API renvoie l'AuthUserDTO complet : la session se réhydrate sans
      // second aller-retour.
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
        <Field label={t("account.ui.profile.businessName")} required error={tval(errors.businessName)}>
          {({ id, describedBy, invalid, required }) => (
            <input
              id={id}
              type="text"
              value={values.businessName}
              onChange={(e) => setValues((v) => ({ ...v, businessName: e.target.value }))}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required={required}
            />
          )}
        </Field>
        <div className="field-row">
          <Field label={t("account.ui.profile.phone")} required error={tval(errors.phone)}>
            {({ id, describedBy, invalid, required }) => (
              <input
                id={id}
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required={required}
                dir="ltr"
              />
            )}
          </Field>
          {/* Seconde ligne FACULTATIVE (D38) : pas de `required`. */}
          <Field label={t("account.ui.profile.phone2")} error={tval(errors.phone2)}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="tel"
                inputMode="tel"
                value={values.phone2}
                onChange={(e) => setValues((v) => ({ ...v, phone2: e.target.value }))}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                dir="ltr"
              />
            )}
          </Field>
        </div>
        {banner ? <Banner kind={banner.kind} text={banner.text} /> : null}
        <button type="submit" className="btn btn-accent" disabled={busy}>
          {t("account.ui.save")}
        </button>
      </form>
    </section>
  );
}

// ── Section 2 : e-mail ───────────────────────────────────────────────────────
function EmailSection({ client }: { client: AccountClient }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const tval = useFieldError();
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
        // Formulation exacte du flux : RIEN n'a basculé. Annoncer « adresse
        // modifiée » ici serait faux, et l'utilisateur croirait devoir se
        // reconnecter avec la nouvelle.
        <Banner kind="ok" text={t("account.ui.email.sent", { email: pending })} />
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field label={t("account.ui.email.newEmail")} required error={tval(errors.newEmail)}>
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

// ── Section 3 : mot de passe (D42, deux modes) ───────────────────────────────
function PasswordSection({ client }: { client: AccountClient }) {
  const { t } = useTranslation();
  const { user, reloadUser } = useAuth();
  const tval = useFieldError();
  const toMessage = useSubmitError();

  // LE pivot de D42 : le mode vient du DTO, donc de la BASE. Le front ne le
  // décide pas — il l'affiche.
  const hasPassword = user?.hasPassword ?? true;

  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ kind: "ok" | "ko"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBanner(null);
    // Confirmation vérifiée AVANT le schéma : c'est une contrainte d'ÉCRAN
    // (l'API ne reçoit jamais ce champ), et la porter sur le bon champ vaut
    // mieux qu'une erreur de formulaire générique.
    if (values.next !== values.confirm) {
      setErrors({ confirm: "account.validation.passwordMismatch" });
      return;
    }
    const checked = validate(changePasswordSchema, {
      newPassword: values.next,
      // `currentPassword` n'est envoyé QUE si le compte en a un. Sur un compte
      // Google-only, l'envoyer serait au mieux ignoré, au pire trompeur.
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
      // Réhydratation OBLIGATOIRE : la réponse ne porte pas le DTO, donc sans
      // ce rechargement `hasPassword` resterait `false` en mémoire et l'écran
      // resterait en mode « définir » alors que le mot de passe existe.
      const wasDefining = !hasPassword;
      await reloadUser();
      setValues({ current: "", next: "", confirm: "" });
      setBanner({
        kind: "ok",
        // En mode « définir », le message doit dire que les DEUX voies
        // fonctionnent désormais — sinon l'utilisateur croit avoir perdu Google.
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
        {/* AUCUN champ « ancien mot de passe » quand il n'en existe pas : le
            demander serait un cul-de-sac (D42). */}
        {hasPassword ? (
          <Field label={t("account.ui.password.current")} required error={tval(errors.currentPassword)}>
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
        <Field label={t("account.ui.password.next")} required error={tval(errors.newPassword)}>
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
        <Field label={t("account.ui.password.confirm")} required error={tval(errors.confirm)}>
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

// ── Section 4 : suppression (D37 + D41, TROIS états) ────────────────────────
function DeletionSection({ client }: { client: AccountClient }) {
  const { t } = useTranslation();
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
        // Échec de LECTURE : on n'affiche pas le formulaire de demande, sinon
        // on proposerait de re-soumettre à quelqu'un qui a peut-être déjà une
        // demande en cours — et la soumission taperait dans l'index unique.
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
        // ÉTAT 2 — demande EN COURS. « envoyée, validée par Zwadj », JAMAIS
        // « compte supprimé » : le compte fonctionne toujours.
        <>
          <Banner
            kind="ok"
            text={t("account.ui.deletion.pending", {
              date: new Date(current.requestedAt).toLocaleDateString()
            })}
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
        // ÉTATS 1 et 3 — aucune demande, ou demande REFUSÉE (avec son motif).
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
          {/* Conséquences écrites AVANT le bouton. Formulation verrouillée : on
              promet la récupération des SALLES, jamais celle du COMPTE — il est
              anonymisé et ne revient pas. */}
          <p className="account-hint">{t("account.ui.deletion.consequences")}</p>
          <p className="account-hint">{t("account.ui.deletion.archiveNote")}</p>
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

export function AccountSettingsPage({ client }: { client?: AccountClient }) {
  const { t } = useTranslation();
  const { api } = useAuth();
  // Construit sur `authedRequest` : token mémoire et mutex de refresh partagés.
  const accountClient = useMemo(() => client ?? createAccountClient(api.authedRequest), [client, api]);

  return (
    <>
      <ProHeader />
      <main className="account-main">
        <h1>{t("account.ui.title")}</h1>
        <ProfileSection client={accountClient} />
        <EmailSection client={accountClient} />
        <PasswordSection client={accountClient} />
        <DeletionSection client={accountClient} />
      </main>
    </>
  );
}
