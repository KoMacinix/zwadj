"use client";

// FC-12 (session `front-client`) — LA GALERIE D'UNE FICHE, ET SA VISIONNEUSE.
//
// ── ⚠ AMÉLIORATION PROGRESSIVE ─────────────────────────────────────────────────────────────────────────────────────────────────
// Chaque vignette RESTE un lien vers la photo pleine taille : c'est le geste du lot A8 (« un lien suffit »), et c'est ce qui marche
// sans JavaScript. Avec JavaScript, un clic SIMPLE ouvre la visionneuse au lieu d'un nouvel onglet ; un clic avec modificateur
// (Ctrl, Cmd, Maj, Alt, ou un autre bouton que le principal) garde le comportement du lien — c'est un geste du visiteur.
//
// ── ⚠ CE QUE LA VISIONNEUSE GARANTIT (consigne de la session, FC-12) ───────────────────────────────────────────────────────────
//   · Échap ferme, Tab reste DANS la boîte, la page dessous ne défile plus, et le FOCUS REVIENT à la vignette qui l'a ouverte — par
//     le SEUL piège de focus du dépôt (`useDismissLayer`, `@zwadj/ui`, lot A11a), pas par un second écrit ici ;
//   · les FLÈCHES suivent la direction de lecture : en arabe (RTL), la flèche GAUCHE mène à la photo SUIVANTE ;
//   · l'`alt` est celui que le pro a saisi, dans la langue de la page — vide, l'image est décorative (règle du lot A8) ;
//   · aucune dépendance : un `role="dialog"` et des gestionnaires, pas de bibliothèque de « lightbox ».
// ⚠ Les photos sont celles du DTO (`venue.photos`, triées par `sortOrder`, la couverture d'abord) : rien n'est réordonné.
import { useCallback, useRef, useState, type KeyboardEvent, type MouseEvent, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { VenuePublicPhotoDTO } from "@zwadj/types";
import { MonthNextIcon, MonthPrevIcon, useDismissLayer } from "@zwadj/ui";
import { mediaSrc } from "../../lib/media-url";

export function VenuePhotos({ photos }: { photos: VenuePublicPhotoDTO[] }) {
  const t = useTranslations("venueDetail");
  const ar = useLocale() === "ar";
  const [ouverte, setOuverte] = useState<number | null>(null);
  const declencheur = useRef<HTMLAnchorElement | null>(null);

  const ouvrir = (index: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    // Un clic avec modificateur reste un lien : « ouvrir dans un nouvel onglet » est un geste du visiteur, pas le nôtre.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    declencheur.current = event.currentTarget;
    setOuverte(index);
  };
  const fermer = useCallback(() => setOuverte(null), []);

  return (
    <>
      <ul aria-label={t("photos")} style={{ display: "grid", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
        {/* `photos` arrive DÉJÀ trié par sortOrder (contrat A4) et la couverture est la première : rien à réordonner ici. */}
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            style={index === 0 ? undefined : { display: "inline-block", marginInlineEnd: 10, verticalAlign: "top", maxInlineSize: 160 }}
          >
            {/* Sans JavaScript, le lien ouvre la pleine taille ; avec, la visionneuse (le lien reste le repli). */}
            <a href={mediaSrc(photo.url)} target="_blank" rel="noopener noreferrer" title={t("photoOpen")} onClick={ouvrir(index)}>
              <img
                src={mediaSrc(index === 0 ? photo.url : photo.thumbUrl)}
                // L'alt saisi par le pro FAIT FOI. Vide, l'image est décorative.
                alt={(ar ? photo.altAr : photo.altFr) ?? ""}
                // Ratio du LARGE en attributs : réserve la boîte, zéro CLS.
                width={photo.width}
                height={photo.height}
                // La couverture n'est PAS différée : c'est le plus grand élément affiché (LCP). Les suivantes, oui.
                loading={index === 0 ? "eager" : "lazy"}
                style={{ inlineSize: "100%", blockSize: "auto", display: "block", borderRadius: "var(--radius)", background: "var(--bg-2)" }}
              />
            </a>
          </li>
        ))}
      </ul>
      {ouverte !== null ? (
        <PhotoViewer photos={photos} index={ouverte} onIndex={setOuverte} onClose={fermer} declencheur={declencheur} />
      ) : null}
    </>
  );
}

function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  declencheur
}: {
  photos: VenuePublicPhotoDTO[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  declencheur: RefObject<HTMLElement | null>;
}) {
  const t = useTranslations("venueDetail");
  const ar = useLocale() === "ar";
  const boite = useRef<HTMLDivElement>(null);
  const fermerBouton = useRef<HTMLButtonElement>(null);
  const total = photos.length;
  const photo = photos[index]!;
  const precedente = () => onIndex((index - 1 + total) % total);
  const suivante = () => onIndex((index + 1) % total);

  useDismissLayer({ open: true, panelRef: boite, onDismiss: onClose, initialFocusRef: fermerBouton, restoreFocusRef: declencheur, lockScroll: true });

  const fleches = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    // En RTL, la droite est le DÉBUT de la ligne : la flèche droite recule, la gauche avance.
    if ((event.key === "ArrowRight") !== ar) suivante();
    else precedente();
  };

  return (
    // ⚠ Pas de fermeture au clic sur le voile : Échap et « Fermer » suffisent, et un clic de navigation raté ne doit rien fermer.
    <div className="photo-viewer">
      <div
        ref={boite}
        className="photo-viewer-box"
        role="dialog"
        aria-modal="true"
        aria-label={t("viewerLabel", { n: index + 1, total })}
        onKeyDown={fleches}
      >
        <button ref={fermerBouton} type="button" className="btn photo-viewer-close" onClick={onClose}>
          {t("viewerClose")}
        </button>
        <img
          className="photo-viewer-img"
          src={mediaSrc(photo.url)}
          alt={(ar ? photo.altAr : photo.altFr) ?? ""}
          width={photo.width}
          height={photo.height}
        />
        <p className="photo-viewer-count" aria-live="polite">
          {t("viewerLabel", { n: index + 1, total })}
        </p>
        {total > 1 ? (
          <div className="photo-viewer-nav">
            <button type="button" className="btn" onClick={precedente} aria-label={t("viewerPrevious")}>
              <MonthPrevIcon size={20} />
            </button>
            <button type="button" className="btn" onClick={suivante} aria-label={t("viewerNext")}>
              <MonthNextIcon size={20} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
