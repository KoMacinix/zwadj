// Chargeur du script Google Identity Services (Lot 9). Client UNIQUEMENT —
// jamais importé côté Pro (cadrage OAuth : bouton absent de apps/pro).
//
// Trois raisons d'exister comme module séparé :
//   1. IDEMPOTENCE — connexion + inscription montent chacun le bouton ; le
//      script ne doit être injecté qu'UNE fois (promesse mémoïsée) ;
//   2. TYPAGE — surface GIS réduite à ce que le flux consomme (renderButton,
//      D29 : jamais de bouton custom, donc jamais prompt/One Tap ici) ;
//   3. TESTABILITÉ — les tests de composant substituent ce module (Google est
//      injoignable en bac à sable, limite connue depuis le cadrage Lot 8).

/** Réponse du callback GIS : `credential` EST l'ID token (flux « ID token
 *  direct », zéro secret côté front — cadrage OAuth verrouillé). */
export interface GisCredentialResponse {
  credential: string;
}

/** Options de `renderButton` restreintes à celles que le Lot 9 utilise. */
export interface GisButtonOptions {
  type: "standard";
  theme: "outline";
  size: "large";
  /** « Continuer avec Google » — le libellé du prototype, localisé par GIS. */
  text: "continue_with";
  shape: "rectangular";
  logo_alignment: "left";
  /** GIS borne la largeur à [200, 400] px — clampée par l'appelant. */
  width: number;
  /** Locale COURANTE du segment `[locale]` — GIS gère sa propre i18n (et le
   *  sens RTL du bouton en `ar`), on ne fait que la lui transmettre. */
  locale: string;
}

export interface GisIdApi {
  initialize(config: { client_id: string; callback: (response: GisCredentialResponse) => void }): void;
  renderButton(parent: HTMLElement, options: GisButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GisIdApi } };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

let pending: Promise<GisIdApi> | null = null;

function resolveApi(): GisIdApi | null {
  return window.google?.accounts?.id ?? null;
}

/**
 * Charge le script GIS et résout l'API `google.accounts.id`. Rejette si le
 * script est injoignable (réseau, bloqueur) — l'appelant dégrade en silence :
 * le formulaire classique reste le chemin nominal, jamais bloqué par Google.
 */
export function loadGis(): Promise<GisIdApi> {
  pending ??= new Promise<GisIdApi>((resolve, reject) => {
    const ready = resolveApi();
    if (ready) {
      resolve(ready);
      return;
    }

    const fail = (message: string) => {
      // Prochain montage : nouvelle tentative (la promesse rejetée n'est pas gardée).
      pending = null;
      reject(new Error(message));
    };

    const settle = () => {
      const api = resolveApi();
      if (api) resolve(api);
      else fail("Script GIS chargé mais API google.accounts.id absente");
    };

    // Un montage précédent (autre page auth) a pu injecter la balise sans que
    // sa promesse survive à la navigation : on se rattache au tag existant.
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", settle, { once: true });
    script.addEventListener("error", () => fail("Script GIS injoignable"), { once: true });
    if (!existing) {
      script.src = GIS_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return pending;
}
