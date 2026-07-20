"use client";

// Bouton « Continuer avec Google » (Lot 9) — Client UNIQUEMENT, monté sur
// connexion + inscription (cadrage OAuth : jamais sur les autres écrans,
// jamais côté Pro). D29 : bouton OFFICIEL `renderButton` de Google Identity
// Services — jamais un bouton custom-stylé, donc pas de hover-lift ni de
// tokens de palette sur CE bouton précis (conséquence assumée du cadrage).
//
// Auto-contenu : séparateur, bouton, appel API, erreurs. Les formulaires ne
// font que le poser — leur flux mot-de-passe reste strictement inchangé.
//
// Feature OFF sans NEXT_PUBLIC_GOOGLE_CLIENT_ID (proposition Lot 9, miroir du
// choix API « GOOGLE_CLIENT_ID optionnelle en dev ») : le composant ne rend
// RIEN — ni séparateur ni bouton — et ne charge pas le script Google. Un poste
// de dev sans projet Google Cloud garde des écrans propres et zéro requête
// tierce. Le cas croisé (front configuré, API non configurée) est une vraie
// mauvaise configuration : l'API répond 503 GOOGLE_AUTH_DISABLED et le message
// localisé s'affiche — visible, jamais silencieux.
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "../../i18n/navigation";
import { ApiError } from "../../lib/auth/auth-client";
import { useAuth } from "../../lib/auth/auth-context";
import { loadGis } from "../../lib/auth/gis";
import { FormError, PRO_URL, useApiErrorMessage } from "./auth-ui";

/** GIS borne la largeur du bouton à [200, 400] px. */
const BUTTON_MIN_WIDTH = 200;
const BUTTON_MAX_WIDTH = 400;

type GoogleError =
  | { kind: "pro" } // GOOGLE_ACCOUNT_NOT_CLIENT : rendu dédié avec lien espace Pro
  | { kind: "message"; text: string };

export function GoogleSignIn() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const t = useTranslations("auth.ui.google");
  const tErrors = useTranslations("auth.errors");
  const locale = useLocale();
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const apiErrorMessage = useApiErrorMessage();

  const containerRef = useRef<HTMLDivElement | null>(null);
  // Verrou anti double-callback (double-clic pendant que la requête part) :
  // une ref, pas un état — aucune raison de re-rendre pour ça.
  const busyRef = useRef(false);
  // useApiErrorMessage rend une closure NEUVE à chaque rendu : en dépendance
  // d'effet elle re-monterait le bouton GIS à chaque setError. Ref mise à jour
  // au rendu — l'effet lit toujours la version courante sans en dépendre.
  const apiErrorMessageRef = useRef(apiErrorMessage);
  apiErrorMessageRef.current = apiErrorMessage;
  const [error, setError] = useState<GoogleError | null>(null);

  // Handler porté par une ref MISE À JOUR À CHAQUE RENDU : l'effet de montage
  // du bouton n'en dépend jamais — un contexte instable (router, callbacks)
  // ne peut donc pas re-monter le bouton GIS. Le callback GIS lit toujours la
  // version courante.
  const handleCredentialRef = useRef<(idToken: string) => Promise<void>>(null);
  handleCredentialRef.current = async (idToken: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    try {
      // Locale COURANTE du segment [locale] dans le body (arbitrage Lot 8 :
      // appliquée à la CRÉATION uniquement, le défaut `fr` côté API n'est
      // qu'un filet). D30 : le cookie émis est toujours persistant.
      await loginWithGoogle({ idToken, locale: locale === "ar" ? "ar" : "fr" });
      router.push("/"); // session ouverte — le bandeau D1 s'affiche si besoin
    } catch (e) {
      if (e instanceof ApiError && e.code === "GOOGLE_ACCOUNT_NOT_CLIENT") {
        setError({ kind: "pro" });
      } else {
        // Les 4 autres codes portent une clé auth.errors.google* partagée —
        // même mécanique t.has() que le reste de la tranche auth.
        setError({ kind: "message", text: apiErrorMessageRef.current(e) });
      }
    } finally {
      busyRef.current = false;
    }
  };

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGis()
      .then((gis) => {
        const parent = containerRef.current;
        if (cancelled || !parent) return;
        gis.initialize({
          client_id: clientId,
          callback: (response) => void handleCredentialRef.current?.(response.credential)
        });
        // Idempotence de montage (StrictMode dev, navigation connexion ⇄
        // inscription) : jamais deux boutons empilés dans le même emplacement.
        parent.replaceChildren();
        gis.renderButton(parent, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.max(BUTTON_MIN_WIDTH, Math.min(BUTTON_MAX_WIDTH, parent.offsetWidth || BUTTON_MAX_WIDTH)),
          locale // GIS localise le libellé et le sens (RTL en `ar`) lui-même
        });
      })
      .catch(() => {
        // Script Google injoignable (réseau, bloqueur) : dégradation
        // SILENCIEUSE — le formulaire email/mot de passe reste le chemin
        // nominal, on n'affiche pas d'erreur pour une option absente.
      });

    return () => {
      cancelled = true;
    };
    // Tout le reste (loginWithGoogle, router, apiErrorMessage) passe par les
    // refs ci-dessus : seules ces deux valeurs reconfigurent le bouton.
  }, [clientId, locale]);

  if (!clientId) return null;

  return (
    <div className="google-block">
      <div className="or-sep" role="separator" aria-orientation="horizontal">
        <span>{t("separator")}</span>
      </div>
      <div ref={containerRef} className="google-btn-slot" data-testid="google-button-slot" />
      {error?.kind === "pro" ? (
        <p className="alert alert-error" role="alert">
          {tErrors("googleAccountNotClient")}{" "}
          <a href={`${PRO_URL}/auth/connexion`} className="link-accent">
            {t("proCta")}
          </a>
        </p>
      ) : error ? (
        <FormError message={error.text} />
      ) : null}
    </div>
  );
}
