import Link from "next/link";
import { PermissionService, SessionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";
import AciNav from "../../AciNav";
import AciPropertyIntelligenceCard from "../../AciPropertyIntelligenceCard";
import AciEvidenceInspector from "../../AciEvidenceInspector";

export const dynamic = "force-dynamic";

export default async function AciResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();
  const { id } = await params;
  const research = await AciCommandCentreService.research(id);

  if (!research.ok) {
    return (
      <div>
        <AciNav current="/admin/aci/workspace" />
        <h1 className="text-2xl font-bold">Research</h1>
        <p className="mt-2 text-slate-600">{research.error}</p>
      </div>
    );
  }

  const listingId = research.identity.listingPropertyId;

  return (
    <div>
      <AciNav current="/admin/aci/workspace" />
      <h1 className="text-3xl font-bold">Research</h1>
      <p className="mt-1 text-slate-600">{research.identity.property}</p>

      <div className="mt-4">
        <AciPropertyIntelligenceCard
          card={{
            id: listingId ?? research.identity.observationId,
            title: research.card.title,
            address: research.card.address,
            town: research.card.town,
            suburb: research.card.suburb,
            propertyType: research.card.propertyType,
            bedrooms: research.card.bedrooms,
            bathrooms: research.card.bathrooms,
            garages: research.card.garages,
            auctionDate: research.card.auctionDate,
            source: research.card.source,
            sourceUrl: research.card.sourceProvenance,
            auctionStatus: research.card.auctionStatus,
            evidenceBadge: research.card.evidenceBadge,
            outcomeState: research.card.outcomeState,
            salePriceState: research.card.salePriceState,
            quality: research.card.quality,
          }}
        />
      </div>

      <section className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Evidence timeline
        </h2>
        <ol className="mt-3 space-y-3 text-sm">
          {research.timelineV2.map((stage, index) => (
            <li key={stage.key} className="border-b border-slate-100 pb-3">
              <div className="flex justify-between gap-4 font-medium">
                <span>
                  {index > 0 ? "↓ " : ""}
                  {stage.available ? "✓" : "·"} {stage.label}
                </span>
                <span>{stage.state}</span>
              </div>
              <div className="mt-1 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                <div>Timestamp: {stage.timestamp ?? "NOT AVAILABLE"}</div>
                <div>Source: {stage.source ?? "NOT AVAILABLE"}</div>
                <div>Reference: {stage.sourceReference ?? "NOT AVAILABLE"}</div>
                <div>Classification: {stage.classification}</div>
                <div>Provenance: {stage.provenance}</div>
                <div>Verification: {stage.verificationState}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sale price verification
        </h2>
        <dl className="mt-3 space-y-1 text-sm">
          <Row label="State" value={research.salePricePanel.state} />
          <Row label="Amount" value={research.salePricePanel.amountDisplay} />
          <Row label="Source" value={research.salePricePanel.source} />
          <Row label="Timestamp" value={research.salePricePanel.timestamp} />
          <Row label="Provenance" value={research.salePricePanel.provenance} />
          <Row label="Verification" value={research.salePricePanel.verificationState} />
        </dl>
      </section>

      <div className="mt-4">
        <AciEvidenceInspector inspector={research.inspector} />
      </div>

      <section className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Investor decision
        </h2>
        <p className="mt-1 text-xs text-slate-500">{research.decision.disclaimer}</p>
        <dl className="mt-3 space-y-1 text-sm">
          <Row label="Evidence" value={research.decision.evidence} />
          <Row label="Outcome certainty" value={research.decision.outcomeCertainty} />
          <Row label="Sale price" value={research.decision.salePrice} />
          <Row label="Comparable availability" value={research.decision.comparableAvailability} />
          <Row label="Market confidence" value={research.decision.marketConfidence} />
          <Row label="Decision status" value={research.decision.status} />
        </dl>
        <ol className="mt-4 space-y-1 text-sm">
          {research.workflow.map((step) => (
            <li key={step.stage} className="flex justify-between">
              <span>{step.stage}</span>
              <span>{step.state}</span>
            </li>
          ))}
        </ol>
      </section>

      {listingId ? (
        <p className="mt-4 text-sm">
          <Link className="underline" href={`/admin/aci/dossier/${listingId}`}>
            Open Auction Evidence Dossier
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{value ?? "UNKNOWN"}</dd>
    </div>
  );
}
