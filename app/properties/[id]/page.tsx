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
import AgencyPerformanceCard from "@/components/property/detail/AgencyPerformanceCard";
import AuctionIntelligencePanel from "@/components/property/detail/AuctionIntelligencePanel";
import DueDiligenceCentreSection from "@/components/property/detail/DueDiligenceCentreSection";
import InvestorWorkspacePanel from "@/components/property/detail/InvestorWorkspacePanel";
import MarketActivitySection from "@/components/property/detail/MarketActivitySection";
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
import HistoricalAuctionActivityPanel from "@/components/property/detail/HistoricalAuctionActivityPanel";
import HistoricalMarketEvidencePanel from "@/components/property/detail/HistoricalMarketEvidencePanel";
import HistoricalOutcomePerformancePanel from "@/components/property/detail/HistoricalOutcomePerformancePanel";
import InvestorIntelligenceSnapshotPanel from "@/components/property/detail/InvestorIntelligenceSnapshotPanel";
import PropertyRelatedSection from "@/components/property/detail/PropertyRelatedSection";
import PropertyStructuredData from "@/components/property/detail/PropertyStructuredData";
import PropertySummarySection from "@/components/property/detail/PropertySummarySection";
import PropertyTimelineSection from "@/components/property/detail/PropertyTimelineSection";
import ResearchReportSummaryCard from "@/components/property/detail/ResearchReportSummaryCard";
import { getPropertyImage } from "@/lib/format";
import { getImages } from "@/lib/images/getImages";
import { selectHeroImage } from "@/lib/images/selectHero";
import { PropertyIntelligence } from "@/lib/intelligence";
import { getComparableSales } from "@/lib/maps/getComparableSales";
import { isFarmPropertyType } from "@/lib/property/agricultural";
import { buildDueDiligenceCentre } from "@/lib/property/dueDiligence";
import {
  buildDocumentLinks,
  getSourceReliabilityLabel,
} from "@/lib/property/detailExperience";
import { buildLifecycleTimeline } from "@/lib/property/lifecycleTimeline";
import { buildAuctionResearchReport } from "@/lib/property/researchReport";
import { getRelatedListingGroups } from "@/lib/property/relatedListings";
import {
  AuctionIntelligenceService,
  AuctionPriceIntelligenceService,
  ComparableIntelligenceService,
  HistoricalIntelligenceService,
  OutcomeIntelligenceService,
  InvestorIntelligence46Service,
  InvestorIntelligence45Service,
  PropertyIntelligenceService,
  PropertyService,
} from "@/lib/services";

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

  const galleryHasImages = images.some((image) =>
    Boolean(image.image_url?.trim()),
  );
  const hasDocuments = buildDocumentLinks(property).length > 0;

  const intelligencePanel = await AuctionIntelligenceService.buildPanel({
    property,
    hasImages: galleryHasImages,
    comparableCount: comparables.length,
  });

  const timelineEvents = buildLifecycleTimeline({
    property,
    hasImages: galleryHasImages,
    hasDocuments,
  });

  const dueDiligence = buildDueDiligenceCentre(property);

  const researchReport = buildAuctionResearchReport({
    property,
    timeline: timelineEvents,
    intelligence: intelligencePanel,
    comparableCount: comparables.length,
    siteUrl,
    dueDiligence,
  });

  let agencyProfile = null;
  try {
    const agencies = await PropertyIntelligenceService.getAgencyDashboardData();
    const needle = (
      property.auction_agency ||
      property.source_name ||
      ""
    )
      .trim()
      .toLowerCase();
    agencyProfile =
      agencies.find((a) => a.agencyName.trim().toLowerCase() === needle) ??
      null;
  } catch {
    agencyProfile = null;
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

  const priceIntelligence =
    await AuctionPriceIntelligenceService.fromProperty(property);

  let historicalActivity: Awaited<
    ReturnType<typeof HistoricalIntelligenceService.forProperty>
  > | null = null;
  try {
    historicalActivity = await HistoricalIntelligenceService.forProperty(
      property.id,
    );
  } catch {
    historicalActivity = null;
  }

  let marketEvidence: Awaited<
    ReturnType<typeof ComparableIntelligenceService.forProperty>
  > | null = null;
  try {
    marketEvidence = await ComparableIntelligenceService.forProperty(property.id);
  } catch {
    marketEvidence = null;
  }

  let outcomeHistory: Awaited<
    ReturnType<typeof OutcomeIntelligenceService.propertyHistory>
  > | null = null;
  try {
    outcomeHistory = await OutcomeIntelligenceService.propertyHistory(property.id);
  } catch {
    outcomeHistory = null;
  }

  let investorIntelligence: Awaited<
    ReturnType<typeof InvestorIntelligence46Service.forProperty>
  > | null = null;
  try {
    investorIntelligence = await InvestorIntelligence46Service.forProperty(property.id);
  } catch {
    investorIntelligence = null;
  }

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
            {/* Hero */}
            <PropertyHeroSection property={property} />

            {/* Auction Intelligence */}
            <AuctionIntelligencePanel panel={intelligencePanel} />

            {/* Research Report Summary */}
            <ResearchReportSummaryCard report={researchReport} />

            {/* Gallery */}
            <PropertyGalleryExperience
              images={gallerySlides}
              title={property.title}
              propertyType={property.property_type ?? "Property"}
              placeholderUrl={heroImage}
            />

            {/* Property Summary */}
            <PropertySummarySection property={property} />

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                {/* Highlights */}
                <PropertyHighlightsSection property={property} />

                {/* Auction Information */}
                <PropertyAuctionCard property={property} />

                {/* Due Diligence Centre */}
                <DueDiligenceCentreSection centre={dueDiligence} />

                {/* Description */}
                <PropertyDescriptionSection
                  description={property.description}
                />

                {/* Agricultural (when applicable) */}
                {isFarm ? (
                  <AgriculturalDetailsSection
                    details={property.agricultural_details}
                  />
                ) : null}

                {/* Location */}
                <PropertyLocationSection
                  property={property}
                  comparables={comparables}
                />

                {/* Comparable Sales */}
                <ComparableSalesSection
                  rows={comparableRows}
                  subjectAuctionPrice={property.auction_price}
                />

                {/* Market Activity */}
                <MarketActivitySection
                  areaLabel={intelligencePanel.areaActivity.label}
                  auctionsThisWeek={
                    intelligencePanel.areaActivity.auctionsThisWeek
                  }
                  activeNearby={intelligencePanel.areaActivity.activeNearby}
                  comparableCount={comparables.length}
                  comparableConfidence={intelligencePanel.comparableConfidence}
                />

                {/* Agency contact + performance */}
                <AuctionAgencyCard
                  source={property.source}
                  auctionAgency={property.auction_agency}
                  agencyContact={property.agency_contact}
                  agencyWebsite={property.agency_website}
                  sourceName={property.source_name}
                  sourceUrl={property.source_url}
                />
                <AgencyPerformanceCard
                  profile={agencyProfile}
                  agencyName={
                    property.auction_agency || property.source_name
                  }
                />

                {/* Auction / Lifecycle Timeline */}
                <PropertyTimelineSection events={timelineEvents} />

                {historicalActivity?.ok ? (
                  <HistoricalAuctionActivityPanel
                    premium={historicalActivity.premium}
                    propertyMasterId={historicalActivity.propertyMasterId}
                    summary={historicalActivity.summary}
                    timeline={historicalActivity.timeline}
                    insufficientMessage={historicalActivity.insufficientMessage}
                  />
                ) : null}

                {marketEvidence?.ok ? (
                  <HistoricalMarketEvidencePanel
                    premium={marketEvidence.premium}
                    summary={marketEvidence.marketEvidence}
                    bestComparable={
                      marketEvidence.comparables.bestComparable
                        ? {
                            town: marketEvidence.comparables.bestComparable.town,
                            suburb: marketEvidence.comparables.bestComparable.suburb,
                            propertyType:
                              marketEvidence.comparables.bestComparable.propertyType,
                            comparableConfidence:
                              marketEvidence.comparables.bestComparable
                                .comparableConfidence,
                            matchingEvidence:
                              marketEvidence.comparables.bestComparable.matchingEvidence,
                            salePrice:
                              marketEvidence.comparables.bestComparable.saleEvidence
                                .salePrice,
                          }
                        : null
                    }
                    comparablesCount={marketEvidence.comparables.comparables.length}
                    researchHref={`/properties/${property.id}/research`}
                  />
                ) : null}

                {investorIntelligence?.ok ? (
                  <InvestorIntelligenceSnapshotPanel
                    decisionStatus={investorIntelligence.result.decisionStatus}
                    decisionReasons={investorIntelligence.result.decisionReasons}
                    snapshot={investorIntelligence.result.snapshot}
                    premium={investorIntelligence.result.premium}
                    researchHref={`/properties/${property.id}/research`}
                  />
                ) : null}

                {outcomeHistory?.ok ? (
                  <HistoricalOutcomePerformancePanel
                    premium={outcomeHistory.premium}
                    chain={outcomeHistory.chain}
                    priceChange={outcomeHistory.priceChange}
                  />
                ) : null}

                {/* Property Documents */}
                <PropertyDocumentsSection property={property} />

                {/* Verification + Provenance */}
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

                {/* Investor Workspace (premium) */}
                <InvestorWorkspacePanel propertyId={property.id} />

                {/* Related */}
                <PropertyRelatedSection groups={relatedGroups} />
              </div>

              <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                <PropertyPricingIntelligence
                  intelligence={priceIntelligence}
                  confidence={intelligence.confidence}
                />
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
