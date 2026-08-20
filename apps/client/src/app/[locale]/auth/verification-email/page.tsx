import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../../lib/seo";
import { VerifyEmailView } from "../../../../components/auth/verify-email-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("auth.ui.verify");
  return {
    title: `${t("successTitle")} — Zwadj`,
    // Tunnel d'authentification : rien à indexer, et `follow: true`
    // quand même — les liens de pied de page (CGU, confidentialité)
    // partent d'ici aussi, et couper l'exploration ne protège rien.
    ...publicMetadata({ locale, canonicalPath: "/auth/verification-email", indexable: false })
  };
}

// Cible des liens d'email (contrat AUTH.VERIFY_EMAIL_PATH — Lot 0).
export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailView token={token ?? null} />;
}
