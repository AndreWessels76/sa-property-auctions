import Link from "next/link";
import { PermissionService, SessionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";
import AciNav from "../AciNav";

export const dynamic = "force-dynamic";

export default async function AciDiscoverPage() {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();
  const discover = await AciCommandCentreService.discover();

  return (
    <div>
      <AciNav current="/admin/aci/discover" />
      <h1 className="text-3xl font-bold">Discover</h1>
      <p className="mt-1 text-slate-600">
        Auction supply and acquisition priority. Invalid records are not imported silently.
      </p>
      <p className="mt-2 text-sm text-slate-500">{discover.note}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span>P1 {discover.counts.p1}</span>
        <span>P2 {discover.counts.p2}</span>
        <span>P3 {discover.counts.p3}</span>
        <span>P4 {discover.counts.p4}</span>
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-2xl border bg-white shadow-sm md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">Property</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Town</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Evidence</th>
              <th className="px-3 py-2">Import</th>
            </tr>
          </thead>
          <tbody>
            {discover.events.map((row) => (
              <tr key={row.observationId} className="border-t">
                <td className="px-3 py-2">
                  <Link className="underline" href={`/admin/aci/research/${row.id}`}>
                    {row.sourceUrl ? row.sourceUrl.replace(/^https?:\/\//, "").slice(0, 48) : row.id}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.source ?? "—"}</td>
                <td className="px-3 py-2">
                  {[row.suburb, row.town, row.province].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-3 py-2">{row.auctionDate ?? "Missing auction date"}</td>
                <td className="px-3 py-2">{row.acquisitionPriority}</td>
                <td className="px-3 py-2">{row.evidenceState}</td>
                <td className="px-3 py-2">
                  {row.importState}
                  {row.rejectionReasons.length ? (
                    <div className="text-xs text-red-700">{row.rejectionReasons.join("; ")}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-3 md:hidden">
        {discover.events.map((row) => (
          <Link
            key={row.observationId}
            href={`/admin/aci/research/${row.id}`}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <div className="font-medium">{row.town ?? "Unknown town"}</div>
            <div className="text-sm text-slate-500">{row.acquisitionPriority} · {row.evidenceState}</div>
            <div className="text-sm">{row.importState}</div>
            {row.rejectionReasons.length ? (
              <div className="mt-1 text-xs text-red-700">{row.rejectionReasons.join("; ")}</div>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
