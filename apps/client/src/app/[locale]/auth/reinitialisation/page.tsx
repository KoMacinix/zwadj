import { getTranslations } from "next-intl/server";
import { ResetForm } from "../../../../components/auth/recovery-forms";

export async function generateMetadata() {
  const t = await getTranslations("auth.ui.reset");
  return { title: `${t("title")} — Zwadj` };
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
