import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";
import { forgotPasswordSchema, resetPasswordSchema } from "@zwadj/types";
import { ApiError } from "../lib/auth-client";
import { issuesToFieldErrors, validate, type FieldErrors } from "@zwadj/api-client";
import { useAuth } from "./auth-context";
import { Field, FormError, PasswordField, ProAuthShell, useApiErrorMessage, useValidationMessage } from "./auth-ui";

export function ForgotPage() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const apiErrorMessage = useApiErrorMessage();
  const tval = useValidationMessage();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError(null);
    const checked = validate(forgotPasswordSchema, { email });
    if (checked.errors) {
      setFieldErrors(checked.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await api.forgotPassword(checked.data.email);
      setSent(true); // réponse constante (D14) : l'UI l'est aussi
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProAuthShell title={t("auth.ui.shell.forgotTitle")} subtitle={t("auth.ui.shell.forgotSubtitle")}>
      <Link to="/auth/connexion" className="backlink">
        ← {t("auth.ui.forgot.back")}
      </Link>
      {sent ? (
        <div className="state-panel">
          <div className="state-icon" aria-hidden>
            ✉
          </div>
          <h1>{t("auth.ui.forgot.sentTitle")}</h1>
          <p>{t("auth.ui.forgot.sentBody", { email })}</p>
          <button type="button" className="link-accent" onClick={() => void submit()} disabled={submitting}>
            {t("auth.ui.forgot.resendLink")}
          </button>
        </div>
      ) : (
        <form className="form" onSubmit={(e) => void submit(e)} noValidate>
          <h1>{t("auth.ui.forgot.title")}</h1>
          <FormError message={formError} />
          <Field label={t("auth.ui.forgot.email")} required error={tval(fieldErrors.email)}>
            {({ id, describedBy, invalid, required }) => (
              <input
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="contact@salle.dz"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required={required}
                dir="ltr"
              />
            )}
          </Field>
          <button type="submit" className="btn btn-accent" disabled={submitting}>
            {submitting ? t("auth.ui.forgot.submitting") : t("auth.ui.forgot.submit")}
          </button>
        </form>
      )}
    </ProAuthShell>
  );
}

const resetFormSchema = resetPasswordSchema
  .extend({ confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "auth.validation.passwordMismatch" });

export function ResetPage() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const apiErrorMessage = useApiErrorMessage();
  const tval = useValidationMessage();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <ProAuthShell title={t("auth.ui.shell.resetTitle")} subtitle={t("auth.ui.shell.resetSubtitle")}>
        <div className="state-panel">
          <h1>{t("auth.ui.reset.missingToken")}</h1>
          <Link to="/auth/mot-de-passe-oublie" className="btn btn-accent">
            {t("auth.ui.reset.requestNew")}
          </Link>
        </div>
      </ProAuthShell>
    );
  }

  if (done) {
    return (
      <ProAuthShell title={t("auth.ui.shell.resetTitle")} subtitle={t("auth.ui.shell.resetSubtitle")}>
        <div className="state-panel">
          <div className="state-icon" aria-hidden>
            ✓
          </div>
          <h1>{t("auth.ui.reset.successTitle")}</h1>
          <p>{t("auth.ui.reset.successBody")}</p>
          <Link to="/auth/connexion" className="btn btn-accent">
            {t("auth.ui.reset.goLogin")}
          </Link>
        </div>
      </ProAuthShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const checked = validate(resetFormSchema, { token, password, confirm });
    if (checked.errors) {
      setFieldErrors(checked.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await api.resetPassword(checked.data.token, checked.data.password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.issues.length > 0) setFieldErrors(issuesToFieldErrors(err.issues));
      else setFormError(apiErrorMessage(err)); // TOKEN_INVALID_OR_EXPIRED (D16)
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProAuthShell title={t("auth.ui.shell.resetTitle")} subtitle={t("auth.ui.shell.resetSubtitle")}>
      <Link to="/auth/connexion" className="backlink">
        ← {t("auth.ui.forgot.back")}
      </Link>
      <form className="form" onSubmit={(e) => void submit(e)} noValidate>
        <h1>{t("auth.ui.reset.title")}</h1>
        <FormError message={formError} />
        <PasswordField
          label={t("auth.ui.reset.password")}
          required
          value={password}
          onChange={setPassword}
          error={tval(fieldErrors.password)}
          hint={t("auth.ui.signup.passwordHint")}
          autoComplete="new-password"
        />
        <PasswordField
          label={t("auth.ui.reset.confirm")}
          required
          value={confirm}
          onChange={setConfirm}
          error={tval(fieldErrors.confirm)}
          autoComplete="new-password"
        />
        <button type="submit" className="btn btn-accent" disabled={submitting}>
          {submitting ? t("auth.ui.reset.submitting") : t("auth.ui.reset.submit")}
        </button>
      </form>
    </ProAuthShell>
  );
}

/** Cible des liens d'email PRO : PRO_URL/auth/verification-email?token=…
 *  (contrat AUTH.VERIFY_EMAIL_PATH, sans préfixe de locale). */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { status, api } = useAuth();
  const [state, setState] = useState<"checking" | "success" | "error">(token ? "checking" : "error");
  const [resendEmail, setResendEmail] = useState("");
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // StrictMode monte deux fois : token à usage unique
    void api
      .verifyEmail(token)
      .then(() => setState("success"))
      .catch(() => setState("error"));
  }, [token]);

  if (state === "checking") {
    return (
      <ProAuthShell title={t("auth.ui.shell.verifyTitle")} subtitle={t("auth.ui.shell.verifySubtitle")}>
        <div className="state-panel">
          <p>{t("auth.ui.verify.checking")}</p>
        </div>
      </ProAuthShell>
    );
  }

  if (state === "success") {
    return (
      <ProAuthShell title={t("auth.ui.shell.verifyTitle")} subtitle={t("auth.ui.shell.verifySubtitle")}>
        <div className="state-panel">
          <div className="state-icon" aria-hidden>
            ✓
          </div>
          <h1>{t("auth.ui.verify.successTitle")}</h1>
          <p>{t("auth.ui.verify.successBody")}</p>
          <Link to={status === "authenticated" ? "/" : "/auth/connexion"} className="btn btn-accent">
            {status === "authenticated" ? t("auth.ui.verify.goHome") : t("auth.ui.verify.goLogin")}
          </Link>
        </div>
      </ProAuthShell>
    );
  }

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    await api.resendVerification(resendEmail).catch(() => undefined);
    setResent(true); // réponse constante côté API : l'UI l'est aussi
  };

  return (
    <ProAuthShell title={t("auth.ui.shell.verifyTitle")} subtitle={t("auth.ui.shell.verifySubtitle")}>
      <div className="state-panel">
        <h1>{t("auth.ui.verify.errorTitle")}</h1>
        <p>{t("auth.ui.verify.errorBody")}</p>
        {resent ? (
          <p className="alert alert-success">{t("auth.ui.verify.resent")}</p>
        ) : (
          <form className="form" style={{ inlineSize: "100%", maxInlineSize: 340 }} onSubmit={(e) => void resend(e)}>
            <div className="field">
              <label htmlFor="verify-resend-email">{t("auth.ui.verify.resendEmailLabel")}</label>
              <input
                id="verify-resend-email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                autoComplete="email"
                placeholder="contact@salle.dz"
                dir="ltr"
                required
              />
            </div>
            <button type="submit" className="btn btn-accent">
              {t("auth.ui.verify.resend")}
            </button>
          </form>
        )}
      </div>
    </ProAuthShell>
  );
}
