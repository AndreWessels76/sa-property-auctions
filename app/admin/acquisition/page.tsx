import Link from "next/link";
import { PermissionService, SessionService } from "@/lib/auth";
import { PartnershipPlatformService } from "@/lib/services/PartnershipPlatformService";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "partners", label: "Partners" },
  { id: "connectors", label: "Connectors" },
  { id: "imports", label: "Imports" },
  { id: "verification", label: "Verification", href: "/admin/verification" },
  { id: "quality", label: "Quality" },
  { id: "coverage", label: "Coverage" },
  { id: "licensing", label: "Licensing" },
  { id: "errors", label: "Errors" },
  { id: "audit", label: "Audit" },
  { id: "reports", label: "Reports" },
  { id: "health", label: "Health" },
] as const;

type SearchParams = Promise<{ tab?: string }>;

export default async function AcquisitionCentrePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();

  const params = await searchParams;
  const tab = params.tab ?? "partners";
  const snap = await PartnershipPlatformService.getAcquisitionCentreSnapshot();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Operations Centre
          </p>
          <h1 className="mt-1 text-3xl font-bold text-navy-900">
            Acquisition Centre
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Licensed partners contribute auction events. The platform owns
            verification, identity, history and quality. Imports never
            auto-publish.
          </p>
        </div>
        <Link
          href="/admin/acquisition/onboarding"
          className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Partner onboarding
        </Link>
      </div>

      {!snap.schemaAvailable ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Partnership tables not applied yet. Apply migration{" "}
          <code className="font-mono text-xs">
            20260803140000_partnership_acquisition_platform.sql
          </code>
          . Connectors still show from code registry.
        </div>
      ) : null}

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Partners", snap.partners.length || snap.connectors.length],
          ["Imports today", snap.intelligence.importsToday],
          ["Verified corpus", snap.intelligence.verifiedInCorpus],
          ["Active catalogue", snap.intelligence.activeCatalogue],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <dt className="text-[11px] uppercase tracking-wide text-slate-400">
              {label}
            </dt>
            <dd className="text-2xl font-bold text-navy-900">{value}</dd>
          </div>
        ))}
      </dl>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Acquisition tabs">
        {TABS.map((t) => {
          const href =
            "href" in t && t.href
              ? t.href
              : `/admin/acquisition?tab=${t.id}`;
          const active = tab === t.id;
          return (
            <Link
              key={t.id}
              href={href}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-navy-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {tab === "partners" || tab === "licensing" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900">Partners</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
            {(snap.partners.length
              ? snap.partners
              : snap.connectors.map((c) => ({
                  id: c.connectorId,
                  partner_code: c.connectorId,
                  partner_name: c.name,
                  status: "onboarding",
                  licence_status: "pending",
                  partner_health: c.health,
                  contract_status: "pending",
                  success_rate: null,
                  verification_rate: null,
                }))
            ).map((p) => (
              <li
                key={p.partner_code}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-navy-900">{p.partner_name}</p>
                  <p className="text-xs text-slate-500">
                    {p.partner_code} · {p.status} · licence {p.licence_status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium uppercase text-slate-500">
                    {p.partner_health}
                  </span>
                  <Link
                    href={`/admin/acquisition/partners/${p.partner_code}`}
                    className="text-sm font-semibold text-navy-900 underline"
                  >
                    Dashboard
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "connectors" || tab === "health" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900">Connector registry</h2>
          <p className="text-sm text-slate-600">
            Plugins self-register from code; runtime health syncs to DB when
            migration is applied.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {snap.connectors.map((c) => (
              <li
                key={c.connectorId}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-navy-900">{c.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {c.connectorId} · v{c.version}
                </p>
                <p className="mt-2 text-xs font-medium uppercase text-slate-600">
                  code: {c.health}
                  {c.dbHealth ? ` · db: ${c.dbHealth}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "imports" || tab === "audit" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900">Import runs</h2>
          {snap.recentImports.length === 0 ? (
            <p className="text-sm text-slate-600">
              No orchestrated import runs recorded yet. Legacy Import Centre
              remains at{" "}
              <Link href="/admin/imports" className="underline">
                /admin/imports
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl border bg-white">
              {snap.recentImports.map((r) => (
                <li key={String(r.id ?? r.import_code)} className="px-4 py-3 text-sm">
                  <p className="font-semibold text-navy-900">
                    {String(r.import_code)} · {String(r.status)}
                  </p>
                  <p className="text-xs text-slate-500">
                    accepted {String(r.rows_accepted)} · rejected{" "}
                    {String(r.rows_rejected)} · duplicates {String(r.duplicates)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "quality" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900">Quality monitoring</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries({
              missingImages: snap.quality.missingImages,
              missingGps: snap.quality.missingGps,
              missingAuctionDates: snap.quality.missingAuctionDates,
              missingAgency: snap.quality.missingAgency,
              invalidAddresses: snap.quality.invalidAddresses,
              expiredListings: snap.quality.expiredListings,
              staleListings: snap.quality.staleListings,
              brokenDocumentHints: snap.quality.brokenDocumentHints,
            }).map(([k, v]) => (
              <div key={k} className="rounded-xl border bg-white p-3">
                <dt className="text-[11px] uppercase text-slate-400">{k}</dt>
                <dd className="text-xl font-bold text-navy-900">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {tab === "coverage" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900">Geographic coverage</h2>
          <p className="text-sm text-slate-600">
            Province coverage:{" "}
            {snap.provinceCoveragePercent == null
              ? "insufficient verified data"
              : `${snap.provinceCoveragePercent}% of 9 provinces`}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {snap.coverage.byProvince.map((c) => (
              <li
                key={c.key}
                className="flex justify-between rounded-lg border bg-white px-3 py-2 text-sm"
              >
                <span>{c.label}</span>
                <span className="font-semibold">
                  {c.active} active / {c.total}
                </span>
              </li>
            ))}
          </ul>
          {snap.coverage.gaps.length > 0 ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-950">
              <p className="font-semibold">Gap analysis</p>
              <ul className="mt-1 list-disc pl-4">
                {snap.coverage.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "errors" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900">Open alerts</h2>
          {snap.openAlerts.length === 0 ? (
            <p className="text-sm text-slate-600">No open acquisition alerts.</p>
          ) : (
            <ul className="space-y-2">
              {snap.openAlerts.map((a) => (
                <li
                  key={String(a.id)}
                  className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-rose-950">
                    {String(a.title)}
                  </p>
                  <p className="text-xs text-rose-800">{String(a.detail ?? "")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "reports" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy-900">Reports</h2>
          <p className="text-sm text-slate-600">
            CSV executive exports available via{" "}
            <code className="text-xs">PartnershipPlatformService.buildExecutiveCsv()</code>
            . PDF/Excel wrappers reserved.
          </p>
          <p className="text-xs text-slate-500">
            Governance issues: {snap.governance.issues.length} · sample{" "}
            {snap.governance.sampleSize}
          </p>
        </section>
      ) : null}

      <p className="mt-8 text-xs text-slate-500">
        Snapshot {new Date(snap.generatedAt).toLocaleString("en-ZA")} ·{" "}
        {snap.intelligence.pendingHint}
      </p>
    </div>
  );
}
