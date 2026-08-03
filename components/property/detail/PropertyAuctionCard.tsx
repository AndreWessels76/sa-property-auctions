import { Calendar, Globe, MapPin } from "lucide-react";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { formatAuctionDate } from "@/lib/format";
import {
  formatAuctionVenueDisplay,
  inferAuctionType,
} from "@/lib/property/detailExperience";

type Props = {
  property: PropertyDTO;
};

export default function PropertyAuctionCard({ property }: Props) {
  const auctionType = inferAuctionType(property);
  const venue = formatAuctionVenueDisplay(property.auction_venue, auctionType);

  return (
    <section
      aria-labelledby="auction-information-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="auction-information-heading"
        className="text-xl font-bold text-navy-900"
      >
        Auction information
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Registration, viewing, and sale conditions as published by the source.
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Auction type
          </dt>
          <dd className="mt-1 flex items-center gap-2 font-semibold text-navy-900">
            {auctionType === "Online Auction" ? (
              <Globe className="h-4 w-4 text-gold-500" aria-hidden />
            ) : (
              <MapPin className="h-4 w-4 text-gold-500" aria-hidden />
            )}
            {auctionType}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Auction date
          </dt>
          <dd className="mt-1 flex items-center gap-2 font-semibold text-navy-900">
            <Calendar className="h-4 w-4 text-gold-500" aria-hidden />
            {property.auction_date
              ? formatAuctionDate(property.auction_date)
              : "Date to be confirmed with agency"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Auction time
          </dt>
          <dd className="mt-1 font-semibold text-navy-900">
            {property.auction_time?.trim() ||
              "Time to be confirmed with auction agency"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Auction venue
          </dt>
          <dd className="mt-1 font-semibold text-navy-900">{venue}</dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3 text-sm text-slate-700">
        {property.viewing_information?.trim() ? (
          <p>
            <span className="font-semibold text-navy-900">Viewing dates: </span>
            {property.viewing_information}
          </p>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-600">
            Viewing arrangements have not been published yet. Contact the
            auction agency for inspection times.
          </p>
        )}

        {property.deposit_requirements?.trim() ? (
          <p>
            <span className="font-semibold text-navy-900">
              Deposit requirements:{" "}
            </span>
            {property.deposit_requirements}
          </p>
        ) : (
          <p className="text-slate-600">
            Deposit requirements not yet published — confirm with the agency
            before registering.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {property.registration_link ? (
          <a
            href={property.registration_link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-navy-950 transition hover:bg-gold-400"
          >
            Register online
          </a>
        ) : null}
        {property.source_url ? (
          <a
            href={property.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-navy-900 transition hover:border-gold-400"
          >
            Original source listing
          </a>
        ) : null}
      </div>
    </section>
  );
}
