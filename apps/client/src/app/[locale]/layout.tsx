import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../i18n/routing";
import { AuthProvider } from "../../lib/auth/auth-context";
import { SiteHeader, UnverifiedBanner } from "../../components/site-chrome";
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
    <html lang={locale} dir={dir}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <SiteHeader />
            <UnverifiedBanner />
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
