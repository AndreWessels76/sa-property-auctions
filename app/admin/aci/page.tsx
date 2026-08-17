import type { ReactNode } from "react";
import { PermissionService, SessionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";
import AciNav from "./AciNav";
import AciActionPanel from "./AciActionPanel";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Card({
  title,
  children,
  tone,
}: {
  title: string;
  children: ReactNode;
  tone?: "red" | "amber" | "green";
}) {
  const border =
    tone === "red"
      ? "border-red-300"
      : tone === "amber"
        ? "border-amber-300"
        : tone === "green"
          ? "border-emerald-300"
          : "border-slate-200";
  return (
    <section className={`rounded-2xl border bg-white p-5 shadow-sm ${border}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3 space-y-1 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default async function AciCommandPage() {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();
  const summary = await AciCommandCentreService.commandSummary();
  const healthTone =
    summary.health.tone === "RED" ? "red" : summary.health.tone === "AMBER" ? "amber" : "green";

  return (
    <div>
      <AciNav current="/admin/aci" />
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-slate-500">ACI Command Centre v1</p>
        <h1 className="text-3xl font-bold">Auction Competitive Intelligence</h1>
        <p className="mt-1 text-slate-600">{summary.positioning.promise}</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="ACI Health" tone={healthTone}>
          <div className="text-2xl font-bold">{summary.health.tone}</div>
          <div>{summary.health.label}</div>
          {summary.health.reasons.map((r) => (
            <div key={r} className="text-slate-500">
              {r}
            </div>
          ))}
        </Card>
        <Card title="Engine">
          <Row label="Verdict" value={summary.engine.verdict} />
          <Row label="Campaign" value={summary.engine.campaign} />
          <Row
            label="Bottleneck"
            value={`${summary.engine.bottleneck.code} — ${summary.engine.bottleneck.count}/${summary.engine.bottleneck.total}`}
          />
        </Card>
        <Card
          title="Public Safety"
          tone={summary.publicSafety.safe ? "green" : "red"}
        >
          <div className="text-xl font-bold">{summary.publicSafety.label}</div>
          <Row label="catalogueLeaks" value={summary.metrics.catalogueLeaks} />
        </Card>
        <Card title="Competitive Score">
          <div className="text-3xl font-bold tabular-nums">{summary.competitiveScore.overall}/100</div>
          <p className="text-xs text-slate-500">{summary.competitiveScore.formula}</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card title="Evidence Coverage">
          <Row
            label="Outcome Evidence"
            value={`${summary.metrics.outcomeEvidence} / ${summary.metrics.historicalEvents}`}
          />
          <Row
            label="Verified Sale Prices"
            value={`${summary.metrics.verifiedSalePrices} / ${summary.metrics.historicalEvents}`}
          />
          <Row label="Verified SOLD" value={summary.metrics.verifiedSold} />
          <Row label="SOLD Without Price" value={summary.metrics.soldWithoutPrice} />
          <Row label="Comparable Ready" value={summary.metrics.comparableReady} />
          <Row label="Market Ready Towns" value={summary.metrics.marketReadyTowns} />
          <Row label="Outcome Missing" value={summary.metrics.outcomeMissing} />
        </Card>
        <Card title="Acquisition">
          <Row
            label="Fetch Attempted"
            value={`${summary.acquisition.fetchAttempted} / ${summary.metrics.historicalEvents}`}
          />
          <Row label="Successful" value={summary.acquisition.fetchSuccessful} />
          <Row label="Failed" value={summary.acquisition.fetchFailed} />
          <Row label="Never Attempted" value={summary.acquisition.neverAttempted} />
          <Row label="Snapshots" value={summary.metrics.snapshots} />
          <Row label="Extractions" value={summary.metrics.extractions} />
        </Card>
        <Card title="Source Health">
          <Row label="Licensed" value={summary.sourceHealth.licensed} />
          <Row label="Active" value={summary.sourceHealth.active} />
          <Row label="Blocked" value={summary.sourceHealth.blocked} />
          <Row label="Failing" value={summary.sourceHealth.failing} />
          <Row label="Stale / never attempted" value={summary.sourceHealth.stale} />
          <Row label="Unavailable" value={summary.sourceHealth.unavailable} />
          <Row label="Licensed sources" value={summary.metrics.licensedSources} />
        </Card>
      </div>

      <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">What needs attention?</h2>
        <p className="mt-1 text-sm text-slate-500">Priorities derived from live production state.</p>
        <ul className="mt-4 space-y-2">
          {summary.actions.map((action) => (
            <li key={action.id}>
              <Link
                href={action.href}
                className="flex flex-col rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-400 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{action.label}</span>
                <span className="text-sm text-slate-500">{action.reason}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="Partner Results Feed">
          <div id="partner-results" />
          <div className="text-xl font-bold">
            {summary.partner.resultsFeed === "CONNECTED"
              ? "RESULTS FEED CONNECTED"
              : "RESULTS FEED NOT CONNECTED"}
          </div>
          <Row label="Contract" value={summary.partner.contractVersion} />
          <Row label="Partner" value={summary.partner.partner} />
          <Row label="Results feed" value={summary.partner.resultsFeed} />
          <Row label="Connection" value={summary.partner.connectionState} />
          <Row label="Authorisation" value={summary.partner.authorisation} />
          <Row label="URL secret" value={summary.partner.url} />
          <Row label="Credentials" value={summary.partner.credentials} />
          <Row label="Production write" value={summary.partner.productionWrite} />
          <Row
            label="Last ingestion"
            value={summary.partner.lastSuccessfulIngestion ?? "NONE"}
          />
          <p className="pt-2 text-xs text-slate-500">{summary.partner.nextAction}</p>
        </Card>
        <Card title="Score breakdown">
          {summary.competitiveScore.components.map((c) => (
            <div key={c.key} className="border-b border-slate-100 py-2">
              <div className="flex justify-between gap-3">
                <span>{c.label}</span>
                <span className="font-medium tabular-nums">{c.score}</span>
              </div>
              <div className="text-xs text-slate-500">
                {c.numerator}/{c.denominator} — {c.explanation}
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="Product readiness">
          <div className="text-3xl font-bold tabular-nums">{summary.productReadiness.overall}/100</div>
          <p className="text-xs text-slate-500">{summary.productReadiness.formula}</p>
          {summary.productReadiness.components.map((c) => (
            <div key={c.key} className="border-b border-slate-100 py-2">
              <div className="flex justify-between gap-3">
                <span>{c.label}</span>
                <span className="font-medium tabular-nums">{c.score}</span>
              </div>
              <div className="text-xs text-slate-500">{c.explanation}</div>
            </div>
          ))}
        </Card>
        <Card title="Positioning">
          <p className="font-semibold">{summary.positioning.promise}</p>
          {summary.positioning.claims.map((claim) => (
            <div key={claim.claim} className="border-b border-slate-100 py-2">
              <div className="text-xs font-semibold">{claim.classification}</div>
              <div>{claim.claim}</div>
              <div className="text-xs text-slate-500">{claim.note}</div>
            </div>
          ))}
        </Card>
      </div>

      <AciActionPanel
        rebuildAllowed={summary.publicSafety.rebuildAllowed}
        catalogueLeaks={summary.metrics.catalogueLeaks}
      />
    </div>
  );
}
