import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Calendar,
  Car,
  MapPin,
} from "lucide-react";
import PropertyMapLazy from "@/app/components/map/PropertyMapLazy";
import GatedAIValuation from "@/app/components/investor/GatedAIValuation";
import GatedPropertyAnalytics from "@/app/components/investor/GatedPropertyAnalytics";
import PropertyIntelligenceCard from "@/app/components/investor/PropertyIntelligenceCard";
import { PropertyIntelligence } from "@/lib/intelligence";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ProgressiveImage from "@/components/property/images/ProgressiveImage";
import AuctionAgencyCard from "@/components/property/AuctionAgencyCard";
import ComparableSalesSection from "@/components/property/ComparableSalesSection";
import PriceSpreadCard from "@/components/property/PriceSpreadCard";
import {
  calcSavingPercent,
  formatAuctionDate,
  formatCurrency,
  formatStatus,
  getPropertyImage,
  getStatusStyle,
} from "@/lib/format";
import { getImages } from "@/lib/images/getImages";
import { selectHeroImage } from "@/lib/images/selectHero";
import { getComparableSales } from "@/lib/maps/getComparableSales";
import { PropertyService } from "@/lib/services";

export const revalidate = 300;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function displayText(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function displayCount(
  value: number | null | undefined,
  singular: string,
  plural: string,
  notApplicable?: boolean,
): string {
  if (notApplicable) {
    return "Not applicable for this property type";
  }
  if (value == null) {
    return `${singular} count not listed`;
  }
  return `${value} ${value === 1 ? singular : plural}`;
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

  const hero = selectHeroImage(images);
  const savingPercent = calcSavingPercent(
    property.estimated_value ?? 0,
    property.auction_price ?? 0,
  );
  const heroImage =
    property.heroImage ||
    hero?.image_url ||
    property.image ||
    getPropertyImage(property.property_type ?? "Property");
  const statusStyle = getStatusStyle(property.status ?? "");
  const intelligence = PropertyIntelligence.analyse(property);
  const isNonResidential =
    /land|commercial|farm|vacant/i.test(property.property_type ?? "");

  const locationLine = [
    property.suburb,
    property.town,
    property.province,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

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
  }));

  const hasEstimate =
    (property.estimated_value ?? 0) > 0 && (property.auction_price ?? 0) > 0;

  return (
    <>
      <Header />
      <main className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/auctions"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-navy-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to auctions
          </Link>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="relative aspect-[21/9] min-h-[240px] w-full">
              <ProgressiveImage
                large={property.heroImage || heroImage}
                medium={property.image || heroImage}
                thumbnail={property.thumbnail || heroImage}
                blur={property.blur_placeholder || ""}
                alt={property.title}
                priority
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span
                  className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${statusStyle}`}
                >
                  {formatStatus(
                    displayText(property.status, "Status not listed"),
                  )}
                </span>
                <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                  {displayText(property.title, "Untitled auction listing")}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-slate-200">
                  <MapPin className="h-4 w-4 text-gold-400" />
                  {locationLine ||
                    "Location details have not been provided for this listing."}
                </p>
              </div>
            </div>

            {images.length > 0 ? (
              <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((image) => (
                  <div
                    key={image.id ?? image.image_url}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl"
                  >
                    <Image
                      src={image.image_url}
                      fill
                      alt={property.title}
                      placeholder={
                        image.blur_placeholder ? "blur" : "empty"
                      }
                      blurDataURL={image.blur_placeholder ?? undefined}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-b border-slate-200 px-6 py-4 text-sm text-slate-500">
                A photo gallery is not available yet for this property. A
                category placeholder image is shown above until provider photos
                are added.
              </div>
            )}

            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-3 lg:p-10">
              <div className="space-y-8 lg:col-span-2">
                <div>
                  <h2 className="text-xl font-bold text-navy-900">
                    Property details
                  </h2>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Property type
                      </p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {displayText(
                          property.property_type,
                          "Type not listed",
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Auction date
                      </p>
                      <p className="mt-1 flex items-center gap-2 font-semibold text-navy-900">
                        <Calendar className="h-4 w-4 text-gold-500" />
                        {property.auction_date
                          ? formatAuctionDate(property.auction_date)
                          : "Auction date not listed"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Province
                      </p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {displayText(property.province, "Province not listed")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Town
                      </p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {displayText(property.town, "Town not listed")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Suburb
                      </p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {displayText(
                          property.suburb,
                          "Suburb not listed for this property",
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Address
                      </p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {displayText(
                          property.address,
                          "Street address not listed",
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Status
                      </p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {formatStatus(
                          displayText(property.status, "Status not listed"),
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Source
                      </p>
                      <p className="mt-1 font-semibold text-navy-900">
                        {displayText(
                          property.source,
                          "Source attribution not yet available",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                      <BedDouble className="h-4 w-4 text-navy-800" />
                      {displayCount(
                        property.bedrooms,
                        "Bed",
                        "Beds",
                        isNonResidential && (property.bedrooms ?? 0) === 0,
                      )}
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                      <Bath className="h-4 w-4 text-navy-800" />
                      {displayCount(
                        property.bathrooms,
                        "Bath",
                        "Baths",
                        isNonResidential && (property.bathrooms ?? 0) === 0,
                      )}
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                      <Car className="h-4 w-4 text-navy-800" />
                      {displayCount(
                        property.garages,
                        "Garage",
                        "Garages",
                        isNonResidential && (property.garages ?? 0) === 0,
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-navy-900">
                    Description
                  </h3>
                  <p className="mt-3 leading-relaxed text-slate-600">
                    {displayText(
                      property.description,
                      "A detailed description has not been provided for this listing yet. Verify all particulars with the auction agency before bidding.",
                    )}
                  </p>
                </div>

                <AuctionAgencyCard source={property.source} />

                <PriceSpreadCard
                  estimatedValue={property.estimated_value}
                  auctionPrice={property.auction_price}
                />

                <ComparableSalesSection
                  rows={comparableRows}
                  subjectAuctionPrice={property.auction_price}
                />

                {property.latitude != null && property.longitude != null ? (
                  <div>
                    <h3 className="mb-4 text-lg font-bold text-navy-900">
                      Location
                    </h3>
                    <PropertyMapLazy
                      latitude={property.latitude}
                      longitude={property.longitude}
                      comparables={comparables.filter((sale) =>
                        Number.isFinite(sale.distanceKm),
                      )}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                    A map pin is not available yet because coordinates have not
                    been recorded for this property. Use the town and province
                    details above when researching the area.
                  </div>
                )}
              </div>

              <aside className="space-y-6 lg:sticky lg:top-24">
                <div className="h-fit rounded-2xl border border-slate-200 bg-navy-900 p-6 text-white shadow-lg">
                  <p className="text-sm text-slate-400">Estimated market value</p>
                  <p className="mt-1 text-lg text-slate-400 line-through">
                    {(property.estimated_value ?? 0) > 0
                      ? formatCurrency(property.estimated_value ?? 0)
                      : "Not available"}
                  </p>

                  <p className="mt-5 text-sm text-gold-400">Auction price</p>
                  <p className="mt-1 text-3xl font-bold">
                    {(property.auction_price ?? 0) > 0
                      ? formatCurrency(property.auction_price ?? 0)
                      : "Not available"}
                  </p>

                  {hasEstimate && savingPercent > 0 ? (
                    <p className="mt-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300">
                      Potential saving of {savingPercent}%
                    </p>
                  ) : hasEstimate ? (
                    <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-300">
                      Auction price is at or above the recorded estimate.
                    </p>
                  ) : (
                    <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-300">
                      Savings cannot be calculated until both estimated value
                      and auction price are available.
                    </p>
                  )}

                  <Link
                    href="/auctions"
                    className="mt-6 flex w-full items-center justify-center rounded-xl bg-gold-500 py-3.5 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400"
                  >
                    Browse more auctions
                  </Link>
                </div>

                <PropertyIntelligenceCard intelligence={intelligence} />

                <GatedAIValuation
                  estimatedValue={property.estimated_value ?? 0}
                  auctionPrice={property.auction_price ?? 0}
                  comparablePrices={comparables
                    .map((sale) => sale.salePrice)
                    .filter((price) => Number.isFinite(price) && price > 0)}
                />

                <GatedPropertyAnalytics
                  estimatedValue={property.estimated_value ?? 0}
                  auctionPrice={property.auction_price ?? 0}
                  comparablePrices={comparables
                    .map((sale) => sale.salePrice)
                    .filter((price) => Number.isFinite(price) && price > 0)}
                />
              </aside>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
