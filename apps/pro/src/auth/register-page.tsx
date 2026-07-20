import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { z } from "zod";
import { registerProSchema } from "@zwadj/types";
import { ApiError, CLIENT_SITE_URL } from "../lib/auth-client";
import { issuesToFieldErrors, validate, type FieldErrors } from "@zwadj/api-client";
import { useAuth } from "./auth-context";
import { Field, FormError, PasswordField, ProAuthShell, useApiErrorMessage, useValidationMessage } from "./auth-ui";

// Schéma API (source de vérité) + contrôles purement front (confirmation, CGU).
const registerProFormSchema = registerProSchema
  .extend({
    confirm: z.string(),
    accept: z.literal(true, { errorMap: () => ({ message: "auth.validation.acceptRequired" }) })
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "auth.validation.passwordMismatch"
  });

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { api } = useAuth();
  const apiErrorMessage = useApiErrorMessage();
  const tval = useValidationMessage();

  const [form, setForm] = useState({ businessName: "", phone: "", email: "", password: "", confirm: "", accept: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // D21 : le PRO ne peut PAS ouvrir de session non vérifiée (D1) — le succès
  // d'inscription mène à un écran « vérifiez votre email », pas au dashboard.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const lang = i18n.language === "ar" ? "ar" : "fr";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const checked = validate(registerProFormSchema, { ...form, locale: lang });
    if (checked.errors) {
      setFieldErrors(checked.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const { data } = checked;
      await api.register({
        role: "PRO",
        email: data.email,
        password: data.password,
        businessName: data.businessName,
        phone: data.phone,
        locale: data.locale
      });
      setRegisteredEmail(data.email);
    } catch (err) {
      if (err instanceof ApiError && err.issues.length > 0) setFieldErrors(issuesToFieldErrors(err.issues));
      else setFormError(apiErrorMessage(err)); // ex. EMAIL_ALREADY_USED (409)
    } finally {
      setSubmitting(false);
    }
  };

  if (registeredEmail) {
    return (
      <ProAuthShell title={t("auth.ui.pro.signupTitle")} subtitle={t("auth.ui.pro.signupSubtitle")}>
        <div className="state-panel">
          <div className="state-icon" aria-hidden>
            ✉
          </div>
          <h1>{t("auth.ui.pro.checkEmailTitle")}</h1>
          <p>{t("auth.ui.pro.checkEmailBody", { email: registeredEmail })}</p>
          {resent ? (
            <p className="alert alert-success" role="status">
              {t("auth.ui.verify.resent")}
            </p>
          ) : (
            <button
              type="button"
              className="link-accent"
              onClick={() => {
                void api.resendVerification(registeredEmail).catch(() => undefined);
                setResent(true);
              }}
            >
              {t("auth.ui.pro.resendCta")}
            </button>
          )}
          <Link to="/auth/connexion" className="btn btn-accent">
            {t("auth.ui.verify.goLogin")}
          </Link>
        </div>
      </ProAuthShell>
    );
  }

  return (
    <ProAuthShell title={t("auth.ui.pro.signupTitle")} subtitle={t("auth.ui.pro.signupSubtitle")} tabs active="signup">
      <form className="form" onSubmit={(e) => void submit(e)} noValidate>
        <h1>{t("auth.ui.signup.title")}</h1>
        <FormError message={formError} />

        <Field label={t("auth.ui.pro.businessName")} required error={tval(fieldErrors.businessName)}>
          {({ id, describedBy, invalid, required }) => (
            <input
              id={id}
              type="text"
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              autoComplete="organization"
              placeholder="Salle El Ryad"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required={required}
            />
          )}
        </Field>

        <Field label={t("auth.ui.pro.phone")} required error={tval(fieldErrors.phone)} hint={t("auth.ui.pro.phoneHint")}>
          {({ id, describedBy, invalid, required }) => (
            <input
              id={id}
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              autoComplete="tel"
              placeholder="+213551234567"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required={required}
              dir="ltr"
            />
          )}
        </Field>

        <Field label={t("auth.ui.signup.email")} required error={tval(fieldErrors.email)}>
          {({ id, describedBy, invalid, required }) => (
            <input
              id={id}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              placeholder="contact@salle.dz"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required={required}
              dir="ltr"
            />
          )}
        </Field>

        <PasswordField
          label={t("auth.ui.signup.password")}
          required
          value={form.password}
          onChange={(v) => set("password", v)}
          error={tval(fieldErrors.password)}
          hint={t("auth.ui.signup.passwordHint")}
          autoComplete="new-password"
        />
        <PasswordField
          label={t("auth.ui.signup.confirm")}
          required
          value={form.confirm}
          onChange={(v) => set("confirm", v)}
          error={tval(fieldErrors.confirm)}
          autoComplete="new-password"
        />

        <label className="checkline">
          <input type="checkbox" checked={form.accept} onChange={(e) => set("accept", e.target.checked)} />
          <span>
            {t("auth.ui.signup.acceptPrefix")}
            <a href={`${CLIENT_SITE_URL}/${lang}/cgu`} className="link-accent" target="_blank" rel="noreferrer">
              {t("auth.ui.signup.terms")}
            </a>
            {t("auth.ui.signup.acceptMiddle")}
            <a href={`${CLIENT_SITE_URL}/${lang}/confidentialite`} className="link-accent" target="_blank" rel="noreferrer">
              {t("auth.ui.signup.privacy")}
            </a>
            {t("auth.ui.signup.acceptSuffix")}
          </span>
        </label>
        {fieldErrors.accept && (
          <p className="field-error" role="alert">
            {tval(fieldErrors.accept)}
          </p>
        )}

        <button type="submit" className="btn btn-accent" disabled={submitting}>
          {submitting ? t("auth.ui.signup.submitting") : t("auth.ui.signup.submit")}
        </button>

        <p className="form-foot">
          {t("auth.ui.signup.hasAccount")}{" "}
          <Link to="/auth/connexion" className="link-accent">
            {t("auth.ui.signup.goLogin")}
          </Link>
        </p>
      </form>
    </ProAuthShell>
  );
}
