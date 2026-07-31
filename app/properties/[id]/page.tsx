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

  return (
    <>
      <Header />
      <main className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/#featured"
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
                  {formatStatus(property.status ?? "")}
                </span>
                <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                  {property.title}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-slate-200">
                  <MapPin className="h-4 w-4 text-gold-400" />
                  {property.town}, {property.province}
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
                      blurDataURL={
                        image.blur_placeholder ?? undefined
                      }
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-3 lg:p-10">
              <div className="lg:col-span-2">
                <h2 className="text-xl font-bold text-navy-900">
                  Property Details
                </h2>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Property Type
                    </p>
                    <p className="mt-1 font-semibold text-navy-900">
                      {property.property_type}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Auction Date
                    </p>
                    <p className="mt-1 flex items-center gap-2 font-semibold text-navy-900">
                      <Calendar className="h-4 w-4 text-gold-500" />
                      {formatAuctionDate(property.auction_date ?? "")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Province
                    </p>
                    <p className="mt-1 font-semibold text-navy-900">
                      {property.province}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Town
                    </p>
                    <p className="mt-1 font-semibold text-navy-900">
                      {property.town}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                    <BedDouble className="h-4 w-4 text-navy-800" />
                    {property.bedrooms ?? 0} Beds
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                    <Bath className="h-4 w-4 text-navy-800" />
                    {property.bathrooms ?? 0} Baths
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                    <Car className="h-4 w-4 text-navy-800" />
                    {property.garages ?? 0} Garages
                  </div>
                </div>

                {property.description ? (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-navy-900">
                      Description
                    </h3>
                    <p className="mt-3 leading-relaxed text-slate-600">
                      {property.description}
                    </p>
                  </div>
                ) : null}

                {property.latitude != null &&
                property.longitude != null ? (
                  <div className="mt-8">
                    <h3 className="mb-4 text-lg font-bold text-navy-900">
                      Location
                    </h3>
                    <PropertyMapLazy
                      latitude={property.latitude}
                      longitude={property.longitude}
                      comparables={comparables}
                    />
                  </div>
                ) : null}

              </div>

              <aside className="space-y-6 lg:sticky lg:top-24">
                <div className="h-fit rounded-2xl border border-slate-200 bg-navy-900 p-6 text-white shadow-lg">
                  <p className="text-sm text-slate-400">Estimated Market Value</p>
                  <p className="mt-1 text-lg text-slate-400 line-through">
                    {formatCurrency(property.estimated_value ?? 0)}
                  </p>

                  <p className="mt-5 text-sm text-gold-400">Auction Price</p>
                  <p className="mt-1 text-3xl font-bold">
                    {formatCurrency(property.auction_price ?? 0)}
                  </p>

                  {savingPercent > 0 ? (
                    <p className="mt-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300">
                      Potential saving of {savingPercent}%
                    </p>
                  ) : null}

                  <Link
                    href="/#featured"
                    className="mt-6 flex w-full items-center justify-center rounded-xl bg-gold-500 py-3.5 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400"
                  >
                    Browse More Auctions
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
