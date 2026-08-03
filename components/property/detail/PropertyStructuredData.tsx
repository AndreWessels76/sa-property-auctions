import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { getPropertyImage } from "@/lib/format";
import {
  buildAuctionDateTimeIso,
  inferAuctionType,
} from "@/lib/property/detailExperience";

type Props = {
  property: PropertyDTO;
  canonicalUrl: string;
};

export default function PropertyStructuredData({
  property,
  canonicalUrl,
}: Props) {
  const image =
    property.heroImage ||
    property.image ||
    getPropertyImage(property.property_type ?? "Property");

  const startDate = buildAuctionDateTimeIso(
    property.auction_date,
    property.auction_time,
  );

  const realEstateListing = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description:
      property.description ||
      "Verified South African property auction listing.",
    url: canonicalUrl,
    datePosted: property.imported_at ?? undefined,
    image,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.town ?? undefined,
      addressRegion: property.province ?? undefined,
      streetAddress: property.address ?? undefined,
      addressCountry: "ZA",
    },
    offers: property.auction_price
      ? {
          "@type": "Offer",
          price: property.auction_price,
          priceCurrency: "ZAR",
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  const event = startDate
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `Auction: ${property.title}`,
        startDate,
        eventAttendanceMode:
          inferAuctionType(property) === "Online Auction"
            ? "https://schema.org/OnlineEventAttendanceMode"
            : "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location:
          inferAuctionType(property) === "Online Auction"
            ? {
                "@type": "VirtualLocation",
                url: property.registration_link || property.source_url || canonicalUrl,
              }
            : {
                "@type": "Place",
                name: property.auction_venue || property.town || property.province,
                address: {
                  "@type": "PostalAddress",
                  addressLocality: property.town ?? undefined,
                  addressRegion: property.province ?? undefined,
                  addressCountry: "ZA",
                },
              },
        organizer: property.auction_agency
          ? {
              "@type": "Organization",
              name: property.auction_agency,
              url: property.agency_website ?? undefined,
            }
          : undefined,
      }
    : null;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Auctions",
        item: `${canonicalUrl.split("/properties/")[0]}/auctions`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: property.title,
        item: canonicalUrl,
      },
    ],
  };

  const payload = [realEstateListing, event, breadcrumb].filter(Boolean);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
