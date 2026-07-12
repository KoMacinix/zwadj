import { useTranslation } from "react-i18next";
import { Button } from "@zwadj/ui";

export function App() {
  const { t } = useTranslation();
  return (
    <main>
      <h1>{t("pro.title")}</h1>
      <Button>{t("pro.cta")}</Button>
    </main>
  );
}
