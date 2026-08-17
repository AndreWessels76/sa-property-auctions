import Link from "next/link";
import { PermissionService, SessionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";
import AciNav from "../../AciNav";
import AciPrintButton from "../../AciPrintButton";

export const dynamic = "force-dynamic";

export default async function AciDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();
  const { id } = await params;
  const result = await AciCommandCentreService.dossier(id);

  if (!result.ok) {
    return (
      <div>
        <AciNav current="/admin/aci/discover" />
        <h1 className="text-2xl font-bold">Auction Evidence Dossier</h1>
        <p className="mt-2">{result.error}</p>
      </div>
    );
  }

  const d = result.dossier;

  return (
    <div>
      <AciNav current="/admin/aci/discover" />
      <p className="text-xs uppercase tracking-widest text-slate-500">Auction Evidence Dossier</p>
      <h1 className="text-3xl font-bold">{result.property.title}</h1>
      <p className="mt-1 text-slate-600">{d.headline}</p>
      <p className="text-sm text-slate-500">{d.subheadline}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm print:hidden">
        <AciPrintButton />
        <span className="rounded-lg border px-3 py-1">{result.publicationSafety.label}</span>
        <span className="rounded-lg border px-3 py-1">Truth: {d.truthStatus}</span>
        <span className="rounded-lg border px-3 py-1">Outcome: {d.outcomeLabel}</span>
        {result.evidenceCompleteness ? (
          <span className="rounded-lg border px-3 py-1">
            Evidence completeness: {result.evidenceCompleteness.overall}%
          </span>
        ) : null}
      </div>

      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Executive Evidence Summary</h2>
        <p className="text-sm">Property: {result.executive.property}</p>
        <p className="text-sm">Auction: {result.executive.auction ?? "UNKNOWN"}</p>
        <p className="text-sm">Outcome: {result.executive.outcome}</p>
        <p className="text-sm">Sale price: {result.executive.salePrice} ({result.executive.salePriceStatus})</p>
        <p className="text-sm">Evidence quality: {result.executive.evidenceQuality}</p>
        <p className="text-sm">Provenance: {result.executive.provenanceStatus}</p>
        <p className="text-sm">Decision: {result.executive.decision}</p>
        <p className="text-xs text-slate-500">{result.executive.disclaimer}</p>
        <p className="mt-2 text-sm">Unknowns: {result.executive.unknowns.length ? result.executive.unknowns.join("; ") : "NONE listed"}</p>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">1. Property identity</h2>
        <p className="text-sm text-slate-600">
          {[result.property.address, result.property.suburb, result.property.town, result.property.province]
            .filter(Boolean)
            .join(", ")}
        </p>
      </section>
      <section className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">2. Auction information</h2>
        <p className="text-sm">Date: {result.property.auctionDate ?? "UNKNOWN"}</p>
        <p className="text-sm">Source: {result.property.source ?? "UNKNOWN"}</p>
      </section>
      <section className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">3. Source provenance</h2>
        <p className="text-sm">Sources checked: {d.provenanceSummary.sourcesChecked}</p>
        <p className="text-sm">Last checked: {d.provenanceSummary.lastChecked ?? "NONE"}</p>
      </section>
      <section className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">4–7. Snapshot, extraction, outcome, sale price</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {d.evidenceChain.map((step) => (
            <li key={step.key}>
              {step.label}: {step.status} — {step.detail}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">Sale outcome: {d.saleOutcome.value} ({d.saleOutcome.status})</p>
        <p className="text-sm">Sale price: {d.salePrice.value} ({d.salePrice.status})</p>
      </section>
      <section className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">8. Comparable evidence</h2>
        <p className="text-sm">
          Count {d.comparables.count}
          {d.comparables.insufficient ? ` — ${d.comparables.reason ?? "INSUFFICIENT_DATA"}` : ""}
        </p>
      </section>
      <section className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">9. Market evidence</h2>
        <p className="text-sm">
          {d.market.insufficient
            ? "INSUFFICIENT_DATA"
            : d.market.medianDisplay}
          {" "}
          ({d.market.verifiedSalesAvailable}/{d.market.thresholdRequired} verified sales)
        </p>
      </section>
      <section className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">10. DD evidence</h2>
        <p className="text-sm">
          {result.evidenceCompleteness
            ? `${result.evidenceCompleteness.overall}% complete`
            : "INSUFFICIENT_DATA"}
        </p>
      </section>
      <section className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">11. Conflicts</h2>
        <p className="text-sm">
          {result.evidenceQuality?.ok
            ? (result.evidenceQuality.conflicts?.length
              ? result.evidenceQuality.conflicts.join("; ")
              : "NONE")
            : "INSUFFICIENT_DATA"}
        </p>
      </section>
      <section className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">12. Evidence gaps</h2>
        <p className="text-sm">
          {result.evidenceQuality?.ok
            ? (result.evidenceQuality.missingEvidence?.length
              ? result.evidenceQuality.missingEvidence.join("; ")
              : "NONE")
            : d.investorView.whatIsUnknown.join("; ") || "INSUFFICIENT_DATA"}
        </p>
      </section>
      <section className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">13. Publication status</h2>
        <p className="text-sm font-medium">{result.publicationSafety.label}</p>
        <p className="text-sm">Catalogue safe: {d.provenanceSummary.catalogueSafe ? "YES" : "NO"}</p>
      </section>

      <p className="mt-4 text-sm">
        <Link className="underline" href={`/admin/aci/research/${id}`}>
          Back to research
        </Link>
      </p>
    </div>
  );
}
