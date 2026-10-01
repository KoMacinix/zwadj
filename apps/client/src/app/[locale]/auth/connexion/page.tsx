import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../../lib/seo";
import { LoginForm } from "../../../../components/auth/login-form";
import { LOGIN_PATH } from "../../../../lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("auth.ui.login");
  return {
    title: `${t("title")} — Zwadj`,
    // Tunnel d'authentification : rien à indexer, et `follow: true`
    // quand même — les liens de pied de page (CGU, confidentialité)
    // partent d'ici aussi, et couper l'exploration ne protège rien.
    ...publicMetadata({ locale, canonicalPath: LOGIN_PATH, indexable: false })
  };
}

export default function LoginPage() {
  return <LoginForm />;
}
