import Link from "next/link";
import AciWatchButton from "./AciWatchButton";

export type AciPropertyCardData = {
  id: string;
  title: string;
  address: string | null;
  town: string | null;
  suburb: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  auctionDate: string | null;
  source: string | null;
  sourceUrl: string | null;
  auctionStatus?: string | null;
  evidenceBadge: string;
  outcomeState: string;
  salePriceState: string;
  quality: string | null;
  lastEvidenceUpdate?: string | null;
};

function Badge({ label }: { label: string }) {
  const inference = label === "INFERENCE";
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold ${
        inference ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-800"
      }`}
    >
      {label}
    </span>
  );
}

export default function AciPropertyIntelligenceCard({
  card,
}: {
  card: AciPropertyCardData;
}) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">
            <Link className="underline" href={`/admin/aci/research/${card.id}`}>
              {card.title}
            </Link>
          </h3>
          <p className="text-sm text-slate-600">
            {[card.address, card.suburb, card.town].filter(Boolean).join(", ") || "UNKNOWN"}
          </p>
        </div>
        <AciWatchButton id={card.id} />
      </div>
      <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
        <div>Type: {card.propertyType ?? "UNKNOWN"}</div>
        <div>
          Beds/Baths/Garages: {card.bedrooms ?? "—"}/{card.bathrooms ?? "—"}/{card.garages ?? "—"}
        </div>
        <div>Auction: {card.auctionDate ?? "UNKNOWN"}</div>
        <div>Source: {card.source ?? "UNKNOWN"}</div>
        <div>Status: {card.auctionStatus ?? "UNKNOWN"}</div>
        <div className="truncate">Provenance: {card.sourceUrl ?? "UNKNOWN"}</div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge label={card.evidenceBadge} />
        <Badge label={card.outcomeState} />
        <Badge label={card.salePriceState} />
        {card.quality ? <Badge label={card.quality} /> : null}
      </div>
      {card.lastEvidenceUpdate ? (
        <p className="mt-2 text-xs text-slate-500">Last evidence: {card.lastEvidenceUpdate}</p>
      ) : null}
    </article>
  );
}
