import { getTranslations } from "next-intl/server";
import { VerifyEmailView } from "../../../../components/auth/verify-email-view";

export async function generateMetadata() {
  const t = await getTranslations("auth.ui.verify");
  return { title: `${t("successTitle")} — Zwadj` };
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
