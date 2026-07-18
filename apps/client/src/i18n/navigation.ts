import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Link / redirect / hooks localisés : préservent /fr /ar automatiquement.
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
