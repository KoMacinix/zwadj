"use client";

// En-tête du site : marque + NAVIGATION + état de session.
//
// Lot UI-N1 — la navigation principale, jusqu'ici renvoyée à « la tranche
// Accueil », est enfin là : sans elle il fallait taper `/fr/salles` à la main.
// Elle vit dans `site-nav.tsx` ; cet en-tête ne fait que la placer.
//
// Lot A11b : une fois connecté, le prénom en clair et le bouton « Se
// déconnecter » cèdent la place au ROND À INITIALES et à son menu — même
// composant que le Pro, SANS « Ajouter une salle » (un client n'a pas de salle).
import { AccountMenu, ThemeToggle, ZwadjLogo, type AccountMenuItem } from "@zwadj/ui";
import { LocaleSwitch } from "./locale-switch";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "../i18n/navigation";
import { useAuth } from "../lib/auth/auth-context";
import { SiteNav } from "./site-nav";

export function SiteHeader() {
  const t = useTranslations("auth.ui.header");
  const tBrand = useTranslations("common.brand");
  const tTheme = useTranslations("common.theme");
  const tAccount = useTranslations("account.ui.menu");
  const { status, user, logout } = useAuth();
  const router = useRouter();

  return (
    // UI-D5 — `--stacked` : le logo reste SEUL sur sa ligne, la nav occupe la
    // seconde, à toute largeur (design de référence). La classe est portée ici
    // et non par `.site-header` nue : les en-têtes Pro partagent ce sélecteur.
    <header className="site-header site-header--stacked">
      <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
        <ZwadjLogo iconSize={22} tagline={tBrand("tagline")} />
      </Link>
      <SiteNav />
      <div className="header-auth">
        <ThemeToggle label={tTheme("toggle")} />
        <LocaleSwitch />
        {status === "authenticated" && user ? (
          <AccountMenu
            // Prénom + nom quand les deux existent ; sinon ce qu'on a. Le
            // composant retombe seul sur l'e-mail si tout est vide.
            displayName={[user.firstName, user.lastName].filter(Boolean).join(" ") || null}
            email={user.email}
            triggerLabel={tAccount("trigger")}
            items={
              [
                { key: "settings", label: tAccount("settings"), onSelect: () => router.push("/compte") },
                { key: "logout", label: t("logout"), onSelect: () => void logout(), destructive: true }
              ] satisfies AccountMenuItem[]
            }
          />
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
