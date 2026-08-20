import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../../lib/seo";
import { ForgotForm } from "../../../../components/auth/recovery-forms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("auth.ui.forgot");
  return {
    title: `${t("title")} — Zwadj`,
    // Tunnel d'authentification : rien à indexer, et `follow: true`
    // quand même — les liens de pied de page (CGU, confidentialité)
    // partent d'ici aussi, et couper l'exploration ne protège rien.
    ...publicMetadata({ locale, canonicalPath: "/auth/mot-de-passe-oublie", indexable: false })
  };
}

export default function ForgotPasswordPage() {
  return <ForgotForm />;
}
