import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { buildDocumentLinks } from "@/lib/property/detailExperience";
import { buildAuctionResearchReport } from "@/lib/property/researchReport";
import { buildLifecycleTimeline } from "@/lib/property/lifecycleTimeline";
import {
  AuctionIntelligenceService,
  PropertyService,
} from "@/lib/services";
import { getComparableSales } from "@/lib/maps/getComparableSales";
import { getImages } from "@/lib/images/getImages";

export const revalidate = 300;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://sa-property-auctions.vercel.app";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await PropertyService.getProperty(id);
  if (!property) return { title: "Research report not found" };
  return {
    title: `Research Report — ${property.title ?? "Property"} | SA Property Auctions`,
    description: "Verified Auction Research Report — no speculative valuations.",
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
              {f.value ?? "Unavailable"}{" "}
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
  const property = await PropertyService.getProperty(id);
  if (!property) notFound();

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

  const hasImages = images.some((i) => Boolean(i.image_url?.trim()));
  const hasDocuments = buildDocumentLinks(property).length > 0;
  const timeline = buildLifecycleTimeline({
    property,
    hasImages,
    hasDocuments,
  });
  const intelligence = await AuctionIntelligenceService.buildPanel({
    property,
    hasImages,
    comparableCount: comparables.length,
  });
  const report = buildAuctionResearchReport({
    property,
    timeline,
    intelligence,
    comparableCount: comparables.length,
    siteUrl,
  });

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
              <a
                href={`/properties/${property.id}/research`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
              >
                Share link
              </a>
              <Link
                href={`/properties/${property.id}/research`}
                className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
                // print via browser chrome — client print button on summary card
              >
                Version {report.version}
              </Link>
            </div>
          </div>

          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
              Auction research report
            </p>
            <h1 className="mt-1 text-3xl font-bold text-navy-900">
              {property.title ?? "Property"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {report.executiveSummary}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Generated {report.generatedAt.slice(0, 19).replace("T", " ")} UTC ·
              Verified data only · No investment advice
            </p>
          </header>

          <FieldTable title="Property Snapshot" fields={report.propertySnapshot} />
          <FieldTable title="Auction Information" fields={report.auctionInformation} />
          <FieldTable title="Classification" fields={report.classification} />
          <FieldTable title="Ownership" fields={report.ownership} />
          <FieldTable title="Location Overview" fields={report.locationOverview} />
          <FieldTable title="Agency" fields={report.agencyInformation} />
          <FieldTable title="Verification" fields={report.verificationStatus} />
          <FieldTable title="Provenance" fields={report.provenance} />

          <section>
            <h2 className="text-lg font-bold text-navy-900">Documents</h2>
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
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">Lifecycle Timeline</h2>
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
          </section>

          <section className="rounded-xl bg-slate-100 p-4 text-sm print:bg-transparent">
            <h2 className="font-bold text-navy-900">Intelligence Summary</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
              <li>
                Listing quality:{" "}
                {report.intelligenceSummary.listingQualityPercent != null
                  ? `${report.intelligenceSummary.listingQualityPercent}%`
                  : "Unavailable"}
              </li>
              <li>
                Verification confidence:{" "}
                {report.intelligenceSummary.verificationConfidence ?? "Unavailable"}
              </li>
              <li>
                Comparable confidence:{" "}
                {report.intelligenceSummary.comparableConfidence ?? "Unavailable"}
              </li>
              {report.intelligenceSummary.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              PDF export reserved for premium workflow · Print via browser · Version
              history keyed to report version {report.version}
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
