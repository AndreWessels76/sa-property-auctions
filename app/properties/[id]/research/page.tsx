import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuctionEvidenceDossierPanel from "@/components/property/dossier/AuctionEvidenceDossierPanel";
import { AuctionEvidenceDossierService } from "@/lib/services/AuctionEvidenceDossierService";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await AuctionEvidenceDossierService.forProperty(id);
  if (!result.ok) return { title: "Evidence dossier not found" };
  return {
    title: `Auction Evidence Dossier — ${result.property.title ?? "Property"} | SA Property Auctions`,
    description:
      "Don't just find the auction. Prove what happened. — source-backed auction history with provenance.",
  };
}

function FieldTable({
  title,
  fields,
}: {
  title: string;
  fields: Array<{ label: string; value: string | null; status: string }>;
}) {
  return (
    <section className="break-inside-avoid">
      <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      <dl className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm"
          >
            <dt className="text-slate-500">{f.label}</dt>
            <dd className="font-medium text-navy-900">
              {f.value ?? "UNKNOWN"}{" "}
              <span className="text-[10px] uppercase text-slate-400">
                ({f.status.replace(/_/g, " ")})
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function ResearchReportPage({ params }: PageProps) {
  const { id } = await params;
  const result = await AuctionEvidenceDossierService.forProperty(id);
  if (!result.ok) notFound();

  const {
    property,
    report,
    dossier,
    hiComparables,
    hiHistorical,
    outcomeHistory,
    hiPerformance,
    evidenceQuality,
    investor46,
    acquisitionDiagnostic,
  } = result;

  return (
    <>
      <Header />
      <main className="bg-slate-50 print:bg-white">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 print:max-w-none print:px-0">
          <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
            <Link
              href={`/properties/${property.id}`}
              className="text-sm font-medium text-slate-600 hover:text-navy-900"
            >
              ← Back to property
            </Link>
            <div className="flex gap-2">
              <Link
                href={`/properties/${property.id}/research`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
              >
                Share dossier
              </Link>
              <span className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white">
                {dossier.version}
              </span>
            </div>
          </div>

          <AuctionEvidenceDossierPanel dossier={dossier} />

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5">
            <h2 className="text-lg font-bold text-navy-900">
              Listing research appendix
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Verified / source-confirmed listing fields — never fabricated. Supporting
              appendix to the Auction Evidence Dossier.
            </p>
            <div className="mt-4 space-y-6">
              <FieldTable title="Property Snapshot" fields={report.propertySnapshot} />
              <FieldTable title="Auction Information" fields={report.auctionInformation} />
              <FieldTable title="Land" fields={report.landInformation} />
              <FieldTable title="Classification" fields={report.classification} />
              <FieldTable title="Ownership" fields={report.ownership} />
              <FieldTable title="Location Overview" fields={report.locationOverview} />
              <FieldTable title="Agency" fields={report.agencyInformation} />
              <FieldTable title="Verification" fields={report.verificationStatus} />
              <FieldTable title="Provenance" fields={report.provenance} />
            </div>

            {report.missingInformation.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-navy-900">Missing information</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {report.missingInformation.join(", ")} — not supplied by auction source
                  (never fabricated).
                </p>
              </div>
            ) : null}

            {report.evidenceNotes.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-navy-900">Extraction evidence</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {report.evidenceNotes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-navy-900">Documents</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {report.documents.map((d) => (
                  <li key={d.label} className="text-slate-700">
                    {d.href ? (
                      <a href={d.href} className="underline" target="_blank" rel="noreferrer">
                        {d.label}
                      </a>
                    ) : (
                      `${d.label} — ${d.status}`
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-navy-900">Lifecycle timeline</h3>
              <ol className="mt-2 space-y-2 text-sm">
                {report.timeline.map((e) => (
                  <li key={e.id}>
                    <span className="text-slate-400">{e.at.slice(0, 10)}</span> —{" "}
                    <span className="font-medium text-navy-900">{e.title}</span>
                    {e.detail ? (
                      <span className="text-slate-600"> · {e.detail}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {hiComparables?.ok || hiHistorical?.ok || outcomeHistory?.ok ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-navy-900">
                Technical evidence appendix
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Engineering detail for audit — main story is in the dossier above.
              </p>
              {hiPerformance ? (
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-slate-500">Recorded events</dt>
                    <dd className="font-semibold">{hiPerformance.recordedAuctionEvents}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Verified sale prices</dt>
                    <dd className="font-semibold">{hiPerformance.verifiedSalePrices}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Comparables</dt>
                    <dd className="font-semibold">
                      {hiPerformance.comparableCount} · {hiPerformance.comparableConfidence}
                    </dd>
                  </div>
                </dl>
              ) : null}
              {evidenceQuality?.ok ? (
                <p className="mt-3 text-sm text-slate-700">
                  HEQ overall:{" "}
                  {evidenceQuality.overallQuality === "INSUFFICIENT_DATA"
                    ? "INSUFFICIENT DATA"
                    : evidenceQuality.overallQuality.replace(/_/g, " ")}
                </p>
              ) : null}
              {acquisitionDiagnostic ? (
                <p className="mt-2 text-sm text-slate-700">
                  Acquisition stopping point: {acquisitionDiagnostic.stoppingPoint}
                </p>
              ) : null}
              {investor46?.ok ? (
                <p className="mt-2 text-sm text-slate-700">
                  Investor decision status:{" "}
                  {investor46.result.decisionStatus.replace(/_/g, " ")}
                </p>
              ) : null}
              {hiHistorical?.ok ? (
                <p className="mt-2 text-xs text-slate-500">
                  Property Master {hiHistorical.propertyMasterId?.slice(0, 8) ?? "not linked"} ·{" "}
                  {hiHistorical.summary.historicalEvents} historical events ·{" "}
                  {hiHistorical.summary.confirmedSales} confirmed sales
                </p>
              ) : null}
              {hiComparables?.ok ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-navy-900">Comparable rows</h3>
                  {hiComparables.comparables.comparables.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">INSUFFICIENT DATA</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {hiComparables.comparables.comparables.slice(0, 5).map((c) => (
                        <li key={c.observationId}>
                          {c.town ?? "—"} · {c.outcome ?? "—"} ·{" "}
                          {c.saleEvidence.verifiedSale && c.saleEvidence.salePrice != null
                            ? `R${c.saleEvidence.salePrice.toLocaleString("en-ZA")}`
                            : "INSUFFICIENT DATA"}{" "}
                          · {c.comparableConfidence}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}

          <p className="text-center text-[11px] text-slate-400">
            Generated {dossier.generatedAt.slice(0, 19).replace("T", " ")} UTC · Verified data
            only · No investment advice · Catalogue safety enforced
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
