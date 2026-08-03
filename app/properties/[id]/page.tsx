import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import AuctionAgencyCard from "@/components/property/AuctionAgencyCard";
import AgriculturalDetailsSection from "@/components/property/AgriculturalDetailsSection";
import ComparableSalesSection from "@/components/property/ComparableSalesSection";
import ListingProvenanceCard from "@/components/property/ListingProvenanceCard";
import PropertyAIInsightsSection from "@/components/property/detail/PropertyAIInsightsSection";
import PropertyAuctionCard from "@/components/property/detail/PropertyAuctionCard";
import PropertyBreadcrumbs from "@/components/property/detail/PropertyBreadcrumbs";
import PropertyDescriptionSection from "@/components/property/detail/PropertyDescriptionSection";
import PropertyDocumentsSection from "@/components/property/detail/PropertyDocumentsSection";
import PropertyGalleryExperience from "@/components/property/detail/PropertyGalleryExperience";
import PropertyHeroSection from "@/components/property/detail/PropertyHeroSection";
import PropertyHighlightsSection from "@/components/property/detail/PropertyHighlightsSection";
import PropertyLocationSection from "@/components/property/detail/PropertyLocationSection";
import PropertyMobileActions from "@/components/property/detail/PropertyMobileActions";
import PropertyPricingIntelligence from "@/components/property/detail/PropertyPricingIntelligence";
import PropertyRelatedSection from "@/components/property/detail/PropertyRelatedSection";
import PropertyStructuredData from "@/components/property/detail/PropertyStructuredData";
import PropertySummarySection from "@/components/property/detail/PropertySummarySection";
import { getPropertyImage } from "@/lib/format";
import { getImages } from "@/lib/images/getImages";
import { selectHeroImage } from "@/lib/images/selectHero";
import { PropertyIntelligence } from "@/lib/intelligence";
import { getComparableSales } from "@/lib/maps/getComparableSales";
import { isFarmPropertyType } from "@/lib/property/agricultural";
import { getSourceReliabilityLabel } from "@/lib/property/detailExperience";
import { getRelatedListingGroups } from "@/lib/property/relatedListings";
import { PropertyService } from "@/lib/services";

export const revalidate = 300;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://sa-property-auctions.vercel.app";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await PropertyService.getProperty(id);

  if (!property) {
    return {
      title: "Property not found",
    };
  }

  const title = property.title?.trim() || "Auction property";
  const description =
    property.description?.trim()?.slice(0, 160) ||
    `Verified ${property.property_type ?? "property"} auction in ${[property.town, property.province].filter(Boolean).join(", ") || "South Africa"}.`;
  const canonical = `${siteUrl}/properties/${property.id}`;
  const image =
    property.heroImage ||
    property.image ||
    getPropertyImage(property.property_type ?? "Property");

  return {
    title: `${title} | SA Property Auctions`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "en_ZA",
      siteName: "SA Property Auctions",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function PropertyPage({ params }: PageProps) {
  const { id } = await params;
  const property = await PropertyService.getProperty(id);

  if (!property) {
    notFound();
  }

  let images: Awaited<ReturnType<typeof getImages>> = [];
  try {
    images = await getImages(property.id);
  } catch {
    images = [];
  }

  let comparables: Awaited<ReturnType<typeof getComparableSales>> = [];
  try {
    comparables = await getComparableSales(property.id);
  } catch {
    comparables = [];
  }

  let relatedGroups: Awaited<ReturnType<typeof getRelatedListingGroups>> = [];
  try {
    relatedGroups = await getRelatedListingGroups(property);
  } catch {
    relatedGroups = [];
  }

  const hero = selectHeroImage(images);
  const heroImage =
    property.heroImage ||
    hero?.image_url ||
    property.image ||
    getPropertyImage(property.property_type ?? "Property");
  const isFarm = isFarmPropertyType(property.property_type);
  const intelligence = PropertyIntelligence.analyse(property);
  const canonicalUrl = `${siteUrl}/properties/${property.id}`;

  const gallerySlides = images
    .filter((image) => Boolean(image.image_url?.trim()))
    .map((image) => ({
      id: image.id ?? image.image_url,
      url: image.image_url,
      blur: image.blur_placeholder,
    }));

  const comparableRows = comparables.map((sale) => ({
    id: sale.id,
    address: sale.address,
    saleDate: sale.saleDate,
    salePrice: sale.salePrice,
    bedrooms: sale.bedrooms ?? null,
    bathrooms: sale.bathrooms ?? null,
    distanceKm: Number.isFinite(sale.distanceKm) ? sale.distanceKm : null,
    priceDifference:
      property.auction_price != null && sale.salePrice > 0
        ? sale.salePrice - property.auction_price
        : null,
    sameTown: Boolean(sale.sameTown),
    propertyType: null,
    landSize: null,
    similarityScore: sale.similarityScore ?? null,
  }));

  const comparablePrices = comparables
    .map((sale) => sale.salePrice)
    .filter((price) => Number.isFinite(price) && price > 0);

  return (
    <>
      <PropertyStructuredData
        property={property}
        canonicalUrl={canonicalUrl}
      />
      <Header />
      <main className="bg-slate-50 pb-24 md:pb-10">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <PropertyBreadcrumbs property={property} />

          <Link
            href="/auctions"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-navy-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to auctions
          </Link>

          <div className="space-y-8">
            {/* 1 Hero summary */}
            <PropertyHeroSection property={property} />

            {/* 2 Gallery */}
            <PropertyGalleryExperience
              images={gallerySlides}
              title={property.title}
              propertyType={property.property_type ?? "Property"}
              placeholderUrl={heroImage}
            />

            {/* 3 Property summary — always visible */}
            <PropertySummarySection property={property} />

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                {/* 4 Highlights */}
                <PropertyHighlightsSection property={property} />

                {/* 5 Auction */}
                <PropertyAuctionCard property={property} />

                {/* 6 Property description */}
                <PropertyDescriptionSection
                  description={property.description}
                />

                {/* 7 Agricultural (farm only) */}
                {isFarm ? (
                  <AgriculturalDetailsSection
                    details={property.agricultural_details}
                  />
                ) : null}

                {/* 8 Location */}
                <PropertyLocationSection
                  property={property}
                  comparables={comparables}
                />

                {/* 9 Comparables */}
                <ComparableSalesSection
                  rows={comparableRows}
                  subjectAuctionPrice={property.auction_price}
                />

                {/* 10 Documents */}
                <PropertyDocumentsSection property={property} />

                {/* 11 Agency */}
                <AuctionAgencyCard
                  source={property.source}
                  auctionAgency={property.auction_agency}
                  agencyContact={property.agency_contact}
                  agencyWebsite={property.agency_website}
                  sourceName={property.source_name}
                  sourceUrl={property.source_url}
                />

                {/* 12 Provenance */}
                <ListingProvenanceCard
                  dataClassification={property.data_classification}
                  verificationState={property.verification_state}
                  sourceName={property.source_name}
                  sourceUrl={property.source_url}
                  sourceLegacy={property.source}
                  externalListingId={property.external_listing_id}
                  importedAt={property.imported_at}
                  lastVerifiedAt={property.last_verified_at}
                  listingStatus={
                    property.listing_status ?? property.status
                  }
                  provenanceNotes={property.provenance_notes}
                  sourceReliabilityLabel={getSourceReliabilityLabel(property)}
                />

                {/* 13 Related */}
                <PropertyRelatedSection groups={relatedGroups} />
              </div>

              <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                {/* Pricing intelligence sidebar */}
                <PropertyPricingIntelligence
                  property={property}
                  confidence={intelligence.confidence}
                />

                {/* 14 AI insights (premium) */}
                <PropertyAIInsightsSection
                  property={property}
                  intelligence={intelligence}
                  comparablePrices={comparablePrices}
                />
              </aside>
            </div>
          </div>
        </div>
      </main>
      <PropertyMobileActions property={property} />
      <Footer />
    </>
  );
}
