import { getApiHealth } from "../../lib/api";
import { HomeView } from "../../components/home-view";

// Page d'accueil (server component, SSR — invariant : pages publiques jamais 100% client).
export default async function HomePage() {
  const health = await getApiHealth();
  const apiStatus = health.status === "ok" ? `ok (db: ${health.db})` : health.status;
  return <HomeView apiStatus={apiStatus} />;
}
