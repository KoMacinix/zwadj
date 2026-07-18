import { getTranslations } from "next-intl/server";
import { RegisterForm } from "../../../../components/auth/register-form";

export async function generateMetadata() {
  const t = await getTranslations("auth.ui.signup");
  return { title: `${t("title")} — Zwadj` };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
