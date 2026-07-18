import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: `${t("privacy")} — Zwadj` };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  return (
    <main className="auth-main">
      <div className="state-panel">
        <h1>{t("privacy")}</h1>
        <p>{t("comingSoon")} / قريباً</p>
      </div>
    </main>
  );
}
