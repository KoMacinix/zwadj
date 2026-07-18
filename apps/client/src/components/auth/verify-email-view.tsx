"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { AuthShell } from "./auth-ui";

/** Page cible des liens d'email (contrat AUTH.VERIFY_EMAIL_PATH, Lot 0).
 *  Un lien peut être ouvert connecté (même navigateur) ou non (autre appareil) :
 *  les deux cas sont gérés — connecté, la session est rafraîchie et le
 *  bandeau D1 tombe sans re-login (fraîcheur /me prouvée au Lot 2). */
export function VerifyEmailView({ token }: { token: string | null }) {
  const t = useTranslations("auth.ui.verify");
  const { status, refreshUser, api } = useAuth();
  const [state, setState] = useState<"checking" | "success" | "error">(token ? "checking" : "error");
  const [resendEmail, setResendEmail] = useState("");
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // StrictMode monte deux fois : un token est à usage unique
    void api
      .verifyEmail(token)
      .then(async () => {
        setState("success");
        await refreshUser(); // si session ouverte : emailVerified passe à true → bandeau D1 disparaît
      })
      .catch(() => setState("error"));
  }, [token, refreshUser]);

  if (state === "checking") {
    return (
      <AuthShell mode="verify">
        <div className="state-panel">
          <p>{t("checking")}</p>
        </div>
      </AuthShell>
    );
  }

  if (state === "success") {
    return (
      <AuthShell mode="verify">
        <div className="state-panel">
          <div className="state-icon" aria-hidden>
            ✓
          </div>
          <h1>{t("successTitle")}</h1>
          <p>{t("successBody")}</p>
          {status === "authenticated" ? (
            <Link href="/" className="btn btn-accent">
              {t("goHome")}
            </Link>
          ) : (
            <Link href="/auth/connexion" className="btn btn-accent">
              {t("goLogin")}
            </Link>
          )}
        </div>
      </AuthShell>
    );
  }

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    await api.resendVerification(resendEmail).catch(() => undefined);
    setResent(true); // réponse constante côté API : l'UI l'est aussi
  };

  return (
    <AuthShell mode="verify">
      <div className="state-panel">
        <h1>{t("errorTitle")}</h1>
        <p>{t("errorBody")}</p>
        {resent ? (
          <p className="alert alert-success">{t("resent")}</p>
        ) : (
          <form className="form" style={{ inlineSize: "100%", maxInlineSize: 340 }} onSubmit={(e) => void resend(e)}>
            <div className="field">
              <label htmlFor="verify-resend-email">{t("resendEmailLabel")}</label>
              <input
                id="verify-resend-email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                autoComplete="email"
                placeholder="amina@email.dz"
                dir="ltr"
                required
              />
            </div>
            <button type="submit" className="btn btn-accent">
              {t("resend")}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
