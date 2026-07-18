"use client";

// Briques UI de la tranche auth (Lot 5). La composition deux panneaux vient
// du prototype (référence VISUELLE : panneau émotionnel + panneau formulaire),
// adaptée en PAGES — les liens des emails (verification-email,
// reinitialisation) exigent de vraies routes, pas un modal. Mobile-first :
// le panneau décoratif passe au-dessus, les bullets desktop-only.
import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { ZwadjLogo } from "@zwadj/ui";
import { ApiError, NetworkError } from "../../lib/auth/auth-client";

export function AuthShell({
  mode,
  tabs = false,
  children
}: {
  mode: "login" | "signup" | "forgot" | "reset" | "verify";
  /** Onglets Connexion/Inscription (liens réels — navigables et SSR). */
  tabs?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("auth.ui");
  return (
    <main className="auth-main">
      <div className="auth-card">
        <aside className="auth-decor">
          <div style={{ position: "relative" }}>
            <div style={{ marginBlockEnd: 24 }}>
              <ZwadjLogo large iconSize={30} tagline={t("shell.tagline")} />
            </div>
            <h2 className="auth-title">{t(`shell.${mode}Title`)}</h2>
            <p className="auth-subtitle">{t(`shell.${mode}Subtitle`)}</p>
          </div>
          {mode === "login" ? (
            /* Bloc de confiance (Lot 7) : CONNEXION UNIQUEMENT — absent
               d'inscription, mot-de-passe-oublié et réinitialisation. */
            <ul className="auth-bullets">
              <li>{t("shell.bullet1")}</li>
              <li>{t("shell.bullet2")}</li>
              <li>{t("shell.bullet3")}</li>
            </ul>
          ) : null}
        </aside>
        <section className="auth-formpane">
          {tabs && (
            <nav className="tabbar" aria-label={t("header.account")}>
              <Link href="/auth/connexion" className="tab" aria-current={mode === "login" ? "page" : undefined}>
                {t("header.login")}
              </Link>
              <Link href="/auth/inscription" className="tab" aria-current={mode === "signup" ? "page" : undefined}>
                {t("header.signup")}
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

/** Champ mot de passe avec bascule Afficher/Masquer (motif du prototype). */
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
  const t = useTranslations("auth.ui");
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label={label}
      required={required}
      error={error}
      hint={hint}
      trailing={
        <button type="button" className="pw-toggle" onClick={() => setVisible((v) => !v)}>
          {visible ? t("hidePw") : t("showPw")}
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

/** Traduit une erreur (ApiError / réseau) en message utilisateur localisé.
 *  Les clés portées par l'API (auth.errors.*) SONT les messages du front —
 *  c'est tout l'intérêt des clés partagées du Lot 0. */
export function useApiErrorMessage(): (e: unknown) => string {
  const t = useTranslations();
  return (e: unknown) => {
    if (e instanceof NetworkError) return t("auth.ui.genericError");
    if (e instanceof ApiError) {
      if (e.status === 429) return t("auth.ui.rateLimited");
      if (e.messageKey && t.has(e.messageKey)) return t(e.messageKey);
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
