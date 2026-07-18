"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { registerClientSchema } from "@zwadj/types";
import { ApiError } from "../../lib/auth/auth-client";
import { Link, useRouter } from "../../i18n/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { issuesToFieldErrors, validate, type FieldErrors } from "../../lib/auth/form-validation";
import { AuthShell, Field, FormError, PasswordField, useApiErrorMessage } from "./auth-ui";

// Le schéma API (source de vérité) + deux contrôles PUREMENT front :
// confirmation et acceptation CGU — l'API ne les reçoit pas (contrat Lot 1).
const registerFormSchema = registerClientSchema
  .extend({
    confirm: z.string(),
    accept: z.literal(true, { errorMap: () => ({ message: "auth.validation.acceptRequired" }) })
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "auth.validation.passwordMismatch"
  });

export function RegisterForm() {
  const t = useTranslations("auth.ui");
  const tv = useTranslations("auth.validation");
  const locale = useLocale() as "fr" | "ar";
  const { registerClient } = useAuth();
  const router = useRouter();
  const apiErrorMessage = useApiErrorMessage();

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirm: "", accept: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const tval = (key?: string) => (key ? tv(key.replace("auth.validation.", "")) : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const checked = validate(registerFormSchema, {
      ...form,
      firstName: form.firstName.trim() || undefined, // optionnels côté contrat
      lastName: form.lastName.trim() || undefined,
      locale
    });
    if (checked.errors) {
      setFieldErrors(checked.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      // Payload = champs du contrat UNIQUEMENT (confirm/accept restent au front)
      const { data } = checked;
      await registerClient({
        role: "CLIENT",
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        locale: data.locale
      });
      router.push("/"); // session CLIENT ouverte non vérifiée : bandeau D1 visible
    } catch (err) {
      if (err instanceof ApiError && err.issues.length > 0) {
        setFieldErrors(issuesToFieldErrors(err.issues)); // 400 de l'API remappé champ par champ
      } else {
        setFormError(apiErrorMessage(err)); // ex. EMAIL_ALREADY_USED (409)
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell mode="signup" tabs>
      <form className="form" onSubmit={(e) => void submit(e)} noValidate>
        <h1>{t("signup.title")}</h1>
        <FormError message={formError} />

        <div className="field-row">
          <Field label={t("signup.firstName")}>
            {({ id }) => (
              <input
                id={id}
                type="text"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                autoComplete="given-name"
                placeholder="Amina"
              />
            )}
          </Field>
          <Field label={t("signup.lastName")}>
            {({ id }) => (
              <input
                id={id}
                type="text"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                autoComplete="family-name"
                placeholder="Boudiaf"
              />
            )}
          </Field>
        </div>

        <Field label={t("signup.email")} required error={tval(fieldErrors.email)}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              placeholder="amina@email.dz"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="ltr"
            />
          )}
        </Field>

        <PasswordField
          label={t("signup.password")}
          required
          value={form.password}
          onChange={(v) => set("password", v)}
          error={tval(fieldErrors.password)}
          hint={t("signup.passwordHint")}
          autoComplete="new-password"
        />
        <PasswordField
          label={t("signup.confirm")}
          required
          value={form.confirm}
          onChange={(v) => set("confirm", v)}
          error={tval(fieldErrors.confirm)}
          autoComplete="new-password"
        />

        <label className="checkline">
          <input type="checkbox" checked={form.accept} onChange={(e) => set("accept", e.target.checked)} />
          <span>
            {t("signup.acceptPrefix")}
            <Link href="/cgu" className="link-accent">
              {t("signup.terms")}
            </Link>
            {t("signup.acceptMiddle")}
            <Link href="/confidentialite" className="link-accent">
              {t("signup.privacy")}
            </Link>
            {t("signup.acceptSuffix")}
          </span>
        </label>
        {fieldErrors.accept && (
          <p className="field-error" role="alert">
            {tval(fieldErrors.accept)}
          </p>
        )}

        <button type="submit" className="btn btn-accent" disabled={submitting}>
          {submitting ? t("signup.submitting") : t("signup.submit")}
        </button>

        <p className="form-foot">
          {t("signup.hasAccount")}{" "}
          <Link href="/auth/connexion" className="link-accent">
            {t("signup.goLogin")}
          </Link>
        </p>
        <p className="field-hint" style={{ textAlign: "center" }}>
          {t("signup.proHint")}
        </p>
      </form>
    </AuthShell>
  );
}
