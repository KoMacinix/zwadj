"use client";

// En-tête minimal de la tranche auth : marque + état de session. La vraie
// navigation (Salles/Prestataires/… + « Bientôt disponible ») appartient à la
// tranche Accueil — hors périmètre Lot 5, ne pas élargir.
import { ZwadjLogo } from "@zwadj/ui";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../i18n/navigation";
import { useAuth } from "../lib/auth/auth-context";

export function SiteHeader() {
  const t = useTranslations("auth.ui.header");
  const { status, user, logout } = useAuth();

  return (
    <header className="site-header">
      <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
        <ZwadjLogo iconSize={22} />
      </Link>
      <div className="header-auth">
        {status === "authenticated" && user ? (
          <>
            <span className="header-user" title={user.email}>
              {user.firstName ?? user.email}
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
              {t("logout")}
            </button>
          </>
        ) : status === "anonymous" ? (
          <>
            <Link href="/auth/connexion" className="btn btn-ghost">
              {t("login")}
            </Link>
            <Link href="/auth/inscription" className="btn btn-accent" style={{ paddingBlock: 8, paddingInline: 14 }}>
              {t("signup")}
            </Link>
          </>
        ) : null /* loading : rien plutôt qu'un flash Connexion→compte */}
      </div>
    </header>
  );
}

/** Bandeau D1 : session CLIENT ouverte mais email non vérifié. La donnée vient
 *  de /login ou /refresh (fraîche), et tombe après vérification + refreshUser. */
export function UnverifiedBanner() {
  const t = useTranslations("auth.ui.banner");
  const { status, user, resendVerification } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (status !== "authenticated" || !user || user.emailVerified) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await resendVerification();
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="banner-warn" role="status">
      <span>{sent ? t("resent") : t("unverified")}</span>
      {!sent && (
        <button type="button" className="link-accent" onClick={() => void resend()} disabled={busy}>
          {t("resend")}
        </button>
      )}
    </div>
  );
}
