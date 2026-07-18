import { getTranslations } from "next-intl/server";
import { ForgotForm } from "../../../../components/auth/recovery-forms";

export async function generateMetadata() {
  const t = await getTranslations("auth.ui.forgot");
  return { title: `${t("title")} — Zwadj` };
}

export default function ForgotPasswordPage() {
  return <ForgotForm />;
}
