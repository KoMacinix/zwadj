import { getTranslations } from "next-intl/server";
import { LoginForm } from "../../../../components/auth/login-form";

export async function generateMetadata() {
  const t = await getTranslations("auth.ui.login");
  return { title: `${t("title")} — Zwadj` };
}

export default function LoginPage() {
  return <LoginForm />;
}
