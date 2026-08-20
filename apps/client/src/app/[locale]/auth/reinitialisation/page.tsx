import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../../lib/seo";
import { ResetForm } from "../../../../components/auth/recovery-forms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("auth.ui.reset");
  return {
    title: `${t("title")} — Zwadj`,
    // Tunnel d'authentification : rien à indexer, et `follow: true`
    // quand même — les liens de pied de page (CGU, confidentialité)
    // partent d'ici aussi, et couper l'exploration ne protège rien.
    ...publicMetadata({ locale, canonicalPath: "/auth/reinitialisation", indexable: false })
  };
}

// Le token vient du lien d'email (?token=…) — lu CÔTÉ SERVEUR et passé en
// prop : pas de useSearchParams côté client, la page reste SSR simple.
export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetForm token={token ?? null} />;
}
