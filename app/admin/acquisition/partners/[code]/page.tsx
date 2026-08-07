import Link from "next/link";
import { notFound } from "next/navigation";
import { PermissionService, SessionService } from "@/lib/auth";
import { PartnershipPlatformService } from "@/lib/services/PartnershipPlatformService";

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();
  const { code } = await params;
  const dash = await PartnershipPlatformService.getPartnerDashboard(code);
  if (!dash) notFound();

  const { partner, stats, displayGate, daysUntilLicenceExpiry, importHistory } =
    dash;

  return (
    <div>
      <Link
        href="/admin/acquisition?tab=partners"
        className="text-sm font-medium text-slate-600 hover:text-navy-900"
      >
        ← Acquisition Centre
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-navy-900">
        {partner.partner_name}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {partner.partner_code} · {partner.status} · {partner.partner_health}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Current", stats.currentListings],
          ["Verified", stats.verifiedListings],
          ["Pending", stats.pendingListings],
          ["Quality", stats.qualityScore ?? "—"],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border bg-white p-4">
            <dt className="text-[11px] uppercase text-slate-400">{k}</dt>
            <dd className="text-2xl font-bold text-navy-900">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8 rounded-2xl border bg-white p-5">
        <h2 className="font-bold text-navy-900">Licensing gate</h2>
        <p className="mt-2 text-sm text-slate-600">
          Public display allowed:{" "}
          <strong>{displayGate.allowed ? "Yes" : "No"}</strong>
          {daysUntilLicenceExpiry != null
            ? ` · days until expiry: ${daysUntilLicenceExpiry}`
            : ""}
        </p>
        {displayGate.reasons.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-xs text-amber-900">
            {displayGate.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="font-bold text-navy-900">Import history</h2>
        {importHistory.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No import runs yet.</p>
        ) : (
          <ul className="mt-2 divide-y rounded-xl border bg-white">
            {importHistory.slice(0, 20).map((r) => (
              <li key={String(r.id ?? r.import_code)} className="px-4 py-2 text-sm">
                {String(r.import_code)} · {String(r.status)} · accepted{" "}
                {String(r.rows_accepted)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
