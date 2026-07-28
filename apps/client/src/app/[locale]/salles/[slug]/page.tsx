// Lot A8 — détail d'une salle, PAR SLUG, rendu par le serveur.
//
// Pas de `generateStaticParams` : il faudrait interroger l'API AU BUILD pour
// lister les slugs. Une API éteinte en CI produirait alors un site sans aucune
// page de salle, et toute salle publiée après le build resterait invisible
// jusqu'au suivant. Le rendu est donc à la demande, avec un `revalidate` de
// 300 s posé sur le `fetch` : première visite rendue, les suivantes servies
// depuis le cache — l'ISR utile, sans dépendance au build.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { VenueDetailView } from "../../../../components/venue/venue-detail-view";
import { getVenueBySlug } from "../../../../lib/api";
import { mediaSrc } from "../../../../lib/media-url";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) {
    const t = await getTranslations({ locale, namespace: "venue.ui.notFound" });
    return { title: t("title") };
  }

  const ar = locale === "ar";
  const name = ar ? venue.nameAr : venue.nameFr;
  const city = ar ? venue.city.nameAr : venue.city.nameFr;
  const t = await getTranslations({ locale, namespace: "venueDetail" });
  // Description : l'accroche du pro si elle existe, sinon un repli factuel.
  // Jamais la description longue tronquée — une phrase coupée au milieu est
  // pire qu'une phrase générée.
  const description = (ar ? venue.taglineAr : venue.taglineFr) ?? t("capacity", { max: venue.capacityMax });
  const cover = venue.photos[0];

  return {
    title: `${name} — ${city}`,
    description,
    openGraph: {
      title: `${name} — ${city}`,
      description,
      // L'aperçu de partage a besoin d'une URL ABSOLUE : `mediaSrc` la fabrique
      // déjà pour l'affichage, elle sert ici telle quelle.
      images: cover ? [{ url: mediaSrc(cover.url) }] : undefined
    }
  };
}

export default async function VenueDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);

  // `null` = slug inconnu, salle non publiée, salle HIDDEN (D33), ou API
  // injoignable. Dans tous ces cas un 404 HTTP, jamais une page « introuvable »
  // servie en 200 : un soft-404 se fait indexer comme une vraie page.
  if (!venue) notFound();

  return <VenueDetailView venue={venue} />;
}
