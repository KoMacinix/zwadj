// Briques UI auth de l'app Pro. Même langage visuel que le client (tokens
// partagés @zwadj/ui/styles.css), copie orientée gestionnaires de salles.
// Différences de runtime : react-i18next (i18next.exists au lieu de t.has),
// react-router (Link/useSearchParams), bascule de langue DANS l'UI (la locale
// n'est pas dans l'URL côté pro — contrat PRO_URL).
import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ZwadjLogo } from "@zwadj/ui";
import { ApiError, NetworkError } from "../lib/auth-client";

export function LangToggle() {
  const { t, i18n } = useTranslation();
  const next = i18n.language === "ar" ? "fr" : "ar";
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => void i18n.changeLanguage(next)}
      aria-label={t("auth.ui.pro.language")}
    >
      {next === "ar" ? "العربية" : "Français"}
    </button>
  );
}

export function ProAuthShell({
  title,
  subtitle,
  tabs = false,
  active,
  bullets = false,
  children
}: {
  title: string;
  subtitle: string;
  /** Onglets Connexion/Inscription (liens réels). */
  tabs?: boolean;
  active?: "login" | "signup";
  /** Bloc de confiance métier — D28/Option A : CONNEXION UNIQUEMENT. */
  bullets?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <main className="auth-main">
      <div className="auth-card">
        <aside className="auth-decor">
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBlockEnd: 24 }}>
              <ZwadjLogo large iconSize={30} suffix="PRO" />
              <LangToggle />
            </div>
            <h2 className="auth-title">{title}</h2>
            <p className="auth-subtitle">{subtitle}</p>
          </div>
          {bullets ? (
            <ul className="auth-bullets">
              <li>{t("auth.ui.pro.bullet1")}</li>
              <li>{t("auth.ui.pro.bullet2")}</li>
              <li>{t("auth.ui.pro.bullet3")}</li>
            </ul>
          ) : null}
        </aside>
        <section className="auth-formpane">
          {tabs && (
            <nav className="tabbar" aria-label={t("auth.ui.header.account")}>
              <Link to="/auth/connexion" className="tab" aria-current={active === "login" ? "page" : undefined}>
                {t("auth.ui.header.login")}
              </Link>
              <Link to="/auth/inscription" className="tab" aria-current={active === "signup" ? "page" : undefined}>
                {t("auth.ui.header.signup")}
              </Link>
            </nav>
          )}
          {children}
        </section>
      </div>
    </main>
  );
}

export function Field({
  label,
  required = false,
  error,
  hint,
  trailing,
  children
}: {
  label: string;
  /** Astérisque --accent après le label (Lot 7, motif AuthField du design). */
  required?: boolean;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-err`;
  return (
    <div className="field">
      <div className="field-head">
        {/* L'astérisque vit HORS du <label> : le nom accessible reste propre
            (« Email », pas « Email* ») pour les lecteurs d'écran. */}
        <span>
          <label htmlFor={id}>{label}</label>
          {required ? (
            <span className="req" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
        {trailing}
      </div>
      {children({ id, describedBy: error ? errorId : undefined, invalid: Boolean(error) })}
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
  required = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label={label}
      required={required}
      error={error}
      hint={hint}
      trailing={
        <button type="button" className="pw-toggle" onClick={() => setVisible((v) => !v)}>
          {visible ? t("auth.ui.hidePw") : t("auth.ui.showPw")}
        </button>
      }
    >
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          dir="ltr"
        />
      )}
    </Field>
  );
}

/** clé i18n auth.validation.* → message traduit (undefined si pas d'erreur). */
export function useValidationMessage(): (key?: string) => string | undefined {
  const { t } = useTranslation();
  return (key?: string) => (key ? t(key) : undefined);
}

/** ApiError/NetworkError → message localisé (mêmes clés partagées que l'API). */
export function useApiErrorMessage(): (e: unknown) => string {
  const { t, i18n } = useTranslation();
  return (e: unknown) => {
    if (e instanceof NetworkError) return t("auth.ui.genericError");
    if (e instanceof ApiError) {
      if (e.status === 429) return t("auth.ui.rateLimited");
      if (e.messageKey && i18n.exists(e.messageKey)) return t(e.messageKey);
    }
    return t("auth.ui.genericError");
  };
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="alert alert-error" role="alert">
      {message}
    </p>
  );
}
