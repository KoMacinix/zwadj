import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../i18n/routing";
import { AuthProvider } from "../../lib/auth/auth-context";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader, UnverifiedBanner } from "../../components/site-chrome";
import { THEME_BOOT_SCRIPT } from "@zwadj/ui/theme-storage";
// Readex Pro AUTO-HÉBERGÉE (@fontsource) : latin + arabe via unicode-range,
// vendorée par npm — le build ne dépend pas de Google Fonts (CI reproductible,
// et pertinent pour un public algérien : zéro requête tierce).
import "@fontsource/readex-pro/300.css";
import "@fontsource/readex-pro/400.css";
import "@fontsource/readex-pro/500.css";
import "@fontsource/readex-pro/600.css";
import "@fontsource/readex-pro/700.css";
import "@zwadj/ui/styles.css";
import "../theme.css";

// Layout racine localisé : lang + dir (RTL pour l'arabe) — invariant AGENTS.md.
//
// Lot UI-D1 (D64) — le thème sombre suit la préférence SYSTÈME en CSS pur ; un
// CHOIX explicite est relu ici, avant peinture. Ce script est la seule façon
// d'éviter l'éclair blanc : le CSS ne peut pas lire `localStorage`, et attendre
// l'hydratation de React signifie afficher la page en clair puis la voir
// basculer sous les yeux du visiteur.
//
// Écrit en JS minimal et SYNCHRONE, premier enfant de <body> : il pose
// l'attribut avant que le navigateur ne peigne quoi que ce soit. Le `try`
// couvre le stockage bloqué (navigation privée), où l'absence d'attribut
// renvoie simplement à la préférence système.
export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    // `suppressHydrationWarning` : le script ci-dessous modifie <html> avant que
    // React n'hydrate. Sans cette exemption, React signalerait un écart qui est
    // exactement l'effet recherché.
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <SiteHeader />
            <UnverifiedBanner />
            {children}
            <SiteFooter />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
