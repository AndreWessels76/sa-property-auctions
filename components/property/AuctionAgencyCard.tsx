import { Building2, Globe, Mail, Phone } from "lucide-react";
import {
  hasAgencyDetails,
  resolveAuctionAgency,
} from "@/lib/auction/agencyDisplay";

type Props = {
  source: string | null | undefined;
};

export default function AuctionAgencyCard({ source }: Props) {
  const agency = resolveAuctionAgency(source);
  const available = hasAgencyDetails(agency);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-navy-900">Auction agency</h2>
      <p className="mt-1 text-sm text-slate-500">
        Conducting auctioneer or selling institution for this listing.
      </p>

      {!available ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
          Agency information not yet available.
        </p>
      ) : (
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex gap-3">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Agency name
              </dt>
              <dd className="mt-0.5 font-semibold text-navy-900">
                {agency.name ?? "Agency information not yet available."}
              </dd>
            </div>
          </div>

          <div className="flex gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Contact
              </dt>
              <dd className="mt-0.5 text-slate-700">
                {agency.contact ??
                  "Contact details not yet available for this agency."}
              </dd>
            </div>
          </div>

          <div className="flex gap-3">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Website
              </dt>
              <dd className="mt-0.5 text-slate-700">
                {agency.website ? (
                  <a
                    href={agency.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-navy-900 underline"
                  >
                    {agency.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "Website not yet available for this agency."
                )}
              </dd>
            </div>
          </div>

          <div className="flex gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Source
              </dt>
              <dd className="mt-0.5 text-slate-700">
                {agency.sourceLabel ??
                  "Source attribution not yet available."}
              </dd>
            </div>
          </div>
        </dl>
      )}
    </section>
  );
}
