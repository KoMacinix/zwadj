// ADM-2 (D350, rang 52) — la fourniture du client ADMIN aux écrans `/admin`.
//
// Le client est bâti SUR `useAuth().api.authedRequest`, comme celui du domaine venue : il PARTAGE le jeton mémoire (D2) et le mutex single-flight du refresh. Il est injectable pour les tests (un double, ou
// le faux serveur honnête de `test-support/admin-doubles.ts`). ⚠ Aucune donnée n'est gardée ICI : chaque écran lit à son montage et tient son état en local — rien du compte précédent ne peut survivre à un
// changement de compte dans ce fournisseur (MD-ADM-10).
import { createContext, useContext, useMemo } from "react";
import { createAdminClient, type AdminClient } from "@zwadj/api-client";
import { useAuth } from "../auth/auth-context";

const AdminClientContext = createContext<AdminClient | null>(null);

/** Avec un client injecté, aucun hook d'authentification n'est appelé : les écrans se testent sans `AuthProvider`. Sans client, le client réel est bâti sur la session. */
export function AdminClientProvider({ children, client }: { children: React.ReactNode; client?: AdminClient }) {
  if (client) return <AdminClientContext.Provider value={client}>{children}</AdminClientContext.Provider>;
  return <SessionAdminClientProvider>{children}</SessionAdminClientProvider>;
}

function SessionAdminClientProvider({ children }: { children: React.ReactNode }) {
  const { api } = useAuth();
  const value = useMemo(() => createAdminClient(api.authedRequest), [api]);
  return <AdminClientContext.Provider value={value}>{children}</AdminClientContext.Provider>;
}

export function useAdminClient(): AdminClient {
  const ctx = useContext(AdminClientContext);
  if (ctx === null) throw new Error("useAdminClient doit être utilisé sous <AdminClientProvider>.");
  return ctx;
}
