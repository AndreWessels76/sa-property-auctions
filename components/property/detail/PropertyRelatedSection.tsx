import Link from "next/link";
import Image from "next/image";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { formatAuctionDate, formatCurrency, getPropertyImage } from "@/lib/format";
import type { RelatedListingGroup } from "@/lib/property/relatedListings";

type Props = {
  groups: RelatedListingGroup[];
};

export default function PropertyRelatedSection({ groups }: Props) {
  if (groups.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-navy-900">Related properties</h2>
        <p className="mt-3 text-sm text-slate-600">
          More verified listings will appear here as the catalogue grows in this
          province and property type.
        </p>
        <Link
          href="/auctions"
          className="mt-4 inline-flex text-sm font-semibold text-navy-900 underline"
        >
          Browse all auctions
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="related-properties-heading"
      className="space-y-8"
    >
      <h2 id="related-properties-heading" className="text-xl font-bold text-navy-900">
        Related properties
      </h2>
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="text-lg font-semibold text-navy-900">{group.title}</h3>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.listings.map((listing) => (
              <RelatedCard key={listing.id} listing={listing} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function RelatedCard({ listing }: { listing: PropertyDTO }) {
  const image =
    listing.thumbnail ||
    listing.image ||
    getPropertyImage(listing.property_type ?? "Property");

  return (
    <li>
      <Link
        href={`/properties/${listing.id}`}
        className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <Image
            src={image}
            alt={listing.title}
            fill
            loading="lazy"
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width:768px) 50vw, 25vw"
          />
        </div>
        <div className="p-4">
          <p className="line-clamp-2 font-semibold text-navy-900">
            {listing.title}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {[listing.town, listing.province].filter(Boolean).join(", ")}
          </p>
          <p className="mt-2 text-sm font-bold text-navy-900">
            {(listing.auction_price ?? 0) > 0
              ? formatCurrency(listing.auction_price ?? 0)
              : "Guide price pending"}
          </p>
          {listing.auction_date ? (
            <p className="mt-1 text-xs text-slate-500">
              {formatAuctionDate(listing.auction_date)}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
