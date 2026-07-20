"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { forgotPasswordSchema, resetPasswordSchema } from "@zwadj/types";
import { Link } from "../../i18n/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { issuesToFieldErrors, validate, type FieldErrors } from "../../lib/auth/form-validation";
import { ApiError } from "../../lib/auth/auth-client";
import { AuthShell, Field, FormError, PasswordField, useApiErrorMessage } from "./auth-ui";
import { z } from "zod";

export function ForgotForm() {
  const t = useTranslations("auth.ui");
  const { api } = useAuth();
  const tv = useTranslations("auth.validation");
  const apiErrorMessage = useApiErrorMessage();

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
      setSent(true); // réponse constante côté API : l'UI l'est aussi (D14)
    } catch (err) {
      setFormError(apiErrorMessage(err)); // en pratique : 429 ou réseau
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell mode="forgot">
      <Link href="/auth/connexion" className="backlink">
        ← {t("forgot.back")}
      </Link>
      {sent ? (
        <div className="state-panel">
          <div className="state-icon" aria-hidden>
            ✉
          </div>
          <h1>{t("forgot.sentTitle")}</h1>
          <p>{t("forgot.sentBody", { email })}</p>
          <button type="button" className="link-accent" onClick={() => void submit()} disabled={submitting}>
            {t("forgot.resendLink")}
          </button>
        </div>
      ) : (
        <form className="form" onSubmit={(e) => void submit(e)} noValidate>
          <h1>{t("forgot.title")}</h1>
          <FormError message={formError} />
          <Field
            label={t("forgot.email")}
            required
            error={fieldErrors.email ? tv(fieldErrors.email.replace("auth.validation.", "")) : undefined}
          >
            {({ id, describedBy, invalid, required }) => (
              <input
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="amina@email.dz"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required={required}
                dir="ltr"
              />
            )}
          </Field>
          <button type="submit" className="btn btn-accent" disabled={submitting}>
            {submitting ? t("forgot.submitting") : t("forgot.submit")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

const resetFormSchema = resetPasswordSchema
  .extend({ confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "auth.validation.passwordMismatch" });

export function ResetForm({ token }: { token: string | null }) {
  const t = useTranslations("auth.ui");
  const { api } = useAuth();
  const tv = useTranslations("auth.validation");
  const apiErrorMessage = useApiErrorMessage();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tval = (key?: string) => (key ? tv(key.replace("auth.validation.", "")) : undefined);

  // Lien ouvert sans token (tronqué, copié à moitié) : état dédié, pas un formulaire cassé.
  if (!token) {
    return (
      <AuthShell mode="reset">
        <div className="state-panel">
          <h1>{t("reset.missingToken")}</h1>
          <Link href="/auth/mot-de-passe-oublie" className="btn btn-accent">
            {t("reset.requestNew")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell mode="reset">
        <div className="state-panel">
          <div className="state-icon" aria-hidden>
            ✓
          </div>
          <h1>{t("reset.successTitle")}</h1>
          <p>{t("reset.successBody")}</p>
          <Link href="/auth/connexion" className="btn btn-accent">
            {t("reset.goLogin")}
          </Link>
        </div>
      </AuthShell>
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
      else setFormError(apiErrorMessage(err)); // TOKEN_INVALID_OR_EXPIRED traduit via la clé partagée
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell mode="reset">
      <Link href="/auth/connexion" className="backlink">
        ← {t("forgot.back")}
      </Link>
      <form className="form" onSubmit={(e) => void submit(e)} noValidate>
        <h1>{t("reset.title")}</h1>
        <FormError message={formError} />
        <PasswordField
          label={t("reset.password")}
          required
          value={password}
          onChange={setPassword}
          error={tval(fieldErrors.password)}
          hint={t("signup.passwordHint")}
          autoComplete="new-password"
        />
        <PasswordField
          label={t("reset.confirm")}
          required
          value={confirm}
          onChange={setConfirm}
          error={tval(fieldErrors.confirm)}
          autoComplete="new-password"
        />
        <button type="submit" className="btn btn-accent" disabled={submitting}>
          {submitting ? t("reset.submitting") : t("reset.submit")}
        </button>
      </form>
    </AuthShell>
  );
}
