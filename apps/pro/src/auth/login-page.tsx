import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { loginSchema } from "@zwadj/types";
import { ApiError } from "../lib/auth-client";
import { validate, type FieldErrors } from "@zwadj/api-client";
import { useAuth } from "./auth-context";
import { Field, FormError, PasswordField, ProAuthShell, useApiErrorMessage, useValidationMessage } from "./auth-ui";

export function LoginPage() {
  const { t } = useTranslation();
  const { login, api } = useAuth();
  const navigate = useNavigate();
  const apiErrorMessage = useApiErrorMessage();
  const tval = useValidationMessage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // D22 : le 403 EMAIL_NOT_VERIFIED (spécifique PRO — D1) a son état propre,
  // avec l'action utile (renvoyer le lien) au lieu d'un simple message d'échec.
  const [notVerified, setNotVerified] = useState(false);
  const [resent, setResent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotVerified(false);
    const checked = validate(loginSchema, { email, password });
    if (checked.errors) {
      setFieldErrors(checked.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await login(checked.data);
      void navigate("/"); // la garde de rôle (D23) prend le relais si CLIENT
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setNotVerified(true);
        setFormError(apiErrorMessage(err));
      } else {
        setFormError(apiErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    const checked = validate(loginSchema.pick({ email: true }), { email });
    if (checked.errors) {
      setFieldErrors(checked.errors);
      return;
    }
    await api.resendVerification(checked.data.email).catch(() => undefined);
    setResent(true); // réponse constante côté API : l'UI l'est aussi
  };

  return (
    <ProAuthShell title={t("auth.ui.shell.loginTitle")} subtitle={t("auth.ui.pro.loginSubtitle")} tabs active="login" bullets>
      <form className="form" onSubmit={(e) => void submit(e)} noValidate>
        <h1>{t("auth.ui.login.title")}</h1>
        <FormError message={formError} />
        {notVerified &&
          (resent ? (
            <p className="alert alert-success" role="status">
              {t("auth.ui.verify.resent")}
            </p>
          ) : (
            <div className="alert" style={{ background: "var(--accent-soft)", border: "1px solid var(--line)" }}>
              <p style={{ margin: "0 0 8px" }}>{t("auth.ui.pro.notVerifiedHint")}</p>
              <button type="button" className="link-accent" onClick={() => void resend()}>
                {t("auth.ui.pro.resendCta")}
              </button>
            </div>
          ))}

        <Field label={t("auth.ui.login.email")} required error={tval(fieldErrors.email)}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="contact@salle.dz"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="ltr"
            />
          )}
        </Field>

        <PasswordField
          label={t("auth.ui.login.password")}
          required
          value={password}
          onChange={setPassword}
          error={tval(fieldErrors.password)}
          autoComplete="current-password"
        />

        <div style={{ textAlign: "end" }}>
          <Link to="/auth/mot-de-passe-oublie" className="link-accent" style={{ fontSize: 12.5 }}>
            {t("auth.ui.login.forgot")}
          </Link>
        </div>

        <button type="submit" className="btn btn-accent" disabled={submitting}>
          {submitting ? t("auth.ui.login.submitting") : t("auth.ui.login.submit")}
        </button>

        <p className="form-foot">
          {t("auth.ui.login.noAccount")}{" "}
          <Link to="/auth/inscription" className="link-accent">
            {t("auth.ui.login.goSignup")}
          </Link>
        </p>
      </form>
    </ProAuthShell>
  );
}
