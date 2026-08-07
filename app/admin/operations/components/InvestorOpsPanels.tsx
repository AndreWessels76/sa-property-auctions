import Link from "next/link";
import { PropertyService } from "@/lib/services";
import { buildDueDiligenceCentre } from "@/lib/property/dueDiligence";
import { buildLifecycleTimeline } from "@/lib/property/lifecycleTimeline";
import { buildDocumentLinks } from "@/lib/property/detailExperience";

/**
 * Investor Experience ops panels — verified counts only (no fabricated KPIs).
 */
export default async function InvestorOpsPanels() {
  let properties: Awaited<ReturnType<typeof PropertyService.getProperties>> = [];
  try {
    properties = await PropertyService.getProperties();
  } catch {
    properties = [];
  }

  const researchReady = properties.filter(
    (p) => p.verification_state === "verified",
  ).length;

  let ddOutstandingTotal = 0;
  let lifecycleEvents = 0;
  for (const p of properties.slice(0, 50)) {
    const dd = buildDueDiligenceCentre(p);
    ddOutstandingTotal += dd.summary.unavailableCount;
    const events = buildLifecycleTimeline({
      property: p,
      hasImages: Boolean(p.heroImage || p.image),
      hasDocuments: buildDocumentLinks(p).length > 0,
    });
    lifecycleEvents += events.length;
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-white">
      <h2 className="text-xl font-bold">Investor Experience Queues</h2>
      <p className="mt-1 text-sm text-slate-300">
        Deterministic queues from the verified public catalogue — never invent
        volume metrics.
      </p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="rounded-xl bg-slate-900/70 p-4">
          <dt className="text-xs uppercase tracking-wider text-slate-400">
            Research queue
          </dt>
          <dd className="mt-1 text-2xl font-bold">{researchReady}</dd>
          <p className="mt-1 text-xs text-slate-400">
            Verified listings eligible for research reports
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/70 p-4">
          <dt className="text-xs uppercase tracking-wider text-slate-400">
            Due diligence gaps
          </dt>
          <dd className="mt-1 text-2xl font-bold">{ddOutstandingTotal}</dd>
          <p className="mt-1 text-xs text-slate-400">
            Unavailable fields across sample (up to 50 listings)
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/70 p-4">
          <dt className="text-xs uppercase tracking-wider text-slate-400">
            Lifecycle events
          </dt>
          <dd className="mt-1 text-2xl font-bold">{lifecycleEvents}</dd>
          <p className="mt-1 text-xs text-slate-400">
            Timeline markers in sample set
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/70 p-4">
          <dt className="text-xs uppercase tracking-wider text-slate-400">
            Tools
          </dt>
          <dd className="mt-2 space-y-1 text-xs">
            <Link href="/calendar" className="block underline">
              Calendar manager
            </Link>
            <Link href="/agencies" className="block underline">
              Agency analytics
            </Link>
            <Link href="/admin/verification" className="block underline">
              Verification / report generation
            </Link>
            <Link href="/alerts" className="block underline">
              Alert management (premium UI)
            </Link>
          </dd>
        </div>
      </dl>
    </section>
  );
}
