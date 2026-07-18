"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { loginSchema } from "@zwadj/types";
import { Link, useRouter } from "../../i18n/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { validate, type FieldErrors } from "../../lib/auth/form-validation";
import { AuthShell, Field, FormError, PasswordField, useApiErrorMessage } from "./auth-ui";

export function LoginForm() {
  const t = useTranslations("auth.ui");
  const tv = useTranslations("auth.validation");
  const { login } = useAuth();
  const router = useRouter();
  const apiErrorMessage = useApiErrorMessage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Coché par défaut (motif du design) : décoché ⇒ cookie de SESSION (D27).
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tval = (key?: string) => (key ? tv(key.replace("auth.validation.", "")) : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const checked = validate(loginSchema, { email, password, rememberMe: remember });
    if (checked.errors) {
      setFieldErrors(checked.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await login(checked.data);
      router.push("/"); // session ouverte — le bandeau D1 s'affiche si non vérifié
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell mode="login" tabs>
      <form className="form" onSubmit={(e) => void submit(e)} noValidate>
        <h1>{t("login.title")}</h1>
        <FormError message={formError} />

        <Field label={t("login.email")} required error={tval(fieldErrors.email)}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="amina@email.dz"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="ltr"
            />
          )}
        </Field>

        <PasswordField
          label={t("login.password")}
          required
          value={password}
          onChange={setPassword}
          error={tval(fieldErrors.password)}
          autoComplete="current-password"
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <label className="checkline" style={{ alignItems: "center" }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ marginBlockStart: 0 }}
            />
            {t("login.remember")}
          </label>
          <Link href="/auth/mot-de-passe-oublie" className="link-accent" style={{ fontSize: 12.5 }}>
            {t("login.forgot")}
          </Link>
        </div>

        <button type="submit" className="btn btn-accent" disabled={submitting}>
          {submitting ? t("login.submitting") : t("login.submit")}
        </button>

        <p className="form-foot">
          {t("login.noAccount")}{" "}
          <Link href="/auth/inscription" className="link-accent">
            {t("login.goSignup")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
