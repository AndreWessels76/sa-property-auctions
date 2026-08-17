import { PermissionService, SessionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";
import AciNav from "../AciNav";
import AciPropertyIntelligenceCard from "../AciPropertyIntelligenceCard";

export const dynamic = "force-dynamic";

export default async function AciOpportunitiesPage() {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();
  const data = await AciCommandCentreService.opportunities();

  return (
    <div>
      <AciNav current="/admin/aci/opportunities" />
      <h1 className="text-3xl font-bold">Research opportunities</h1>
      <p className="mt-1 text-slate-600">{data.note}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <span>HIGH PRIORITY {data.counts.highPriority}</span>
        <span>RESEARCH {data.counts.research}</span>
        <span>WAITING {data.counts.waiting}</span>
        <span>COMPLETE {data.counts.complete}</span>
      </div>
      {(["HIGH PRIORITY", "RESEARCH", "WAITING", "COMPLETE"] as const).map((key) => (
        <section key={key} className="mt-6">
          <h2 className="text-lg font-semibold">{key}</h2>
          {data.grouped[key].length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">INSUFFICIENT_DATA</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {data.grouped[key].slice(0, 20).map((row) => (
                <AciPropertyIntelligenceCard
                  key={row.observationId}
                  card={{
                    id: row.id,
                    title: row.title,
                    address: row.address,
                    town: row.town,
                    suburb: row.suburb,
                    propertyType: row.propertyType,
                    bedrooms: row.bedrooms,
                    bathrooms: row.bathrooms,
                    garages: row.garages,
                    auctionDate: row.auctionDate,
                    source: row.source,
                    sourceUrl: row.sourceUrl,
                    evidenceBadge: row.evidenceBadge,
                    outcomeState: row.outcomeState,
                    salePriceState: row.salePriceState,
                    quality: row.quality,
                    lastEvidenceUpdate: row.lastEvidenceUpdate,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
