import { PermissionService, SessionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";
import AciNav from "../AciNav";

export const dynamic = "force-dynamic";

export default async function AciMarketPage() {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();
  const market = await AciCommandCentreService.market();

  return (
    <div>
      <AciNav current="/admin/aci/market" />
      <h1 className="text-3xl font-bold">Market Intelligence</h1>
      <p className="mt-1 text-slate-600">
        Market-ready remains ≥{market.threshold} verified sale prices. Medians are not invented.
      </p>
      <p className="mt-2 text-sm font-medium">{market.overall.status}: {market.note}</p>
      {market.overall.ready ? (
        <p className="mt-1 text-sm">
          Median R{market.overall.median?.toLocaleString("en-ZA")} · range{" "}
          {market.overall.min?.toLocaleString("en-ZA")}–{market.overall.max?.toLocaleString("en-ZA")} ·{" "}
          {market.overall.count} verified transactions · {market.overall.provenance}
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">
          Median, average, trend, and comparable value are not calculated.
        </p>
      )}
      <p className="mt-1 text-sm text-slate-500">
        Verified sale prices: {market.verifiedSalePrices} · Market-ready towns: {market.marketReadyTowns}
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">Town</th>
              <th className="px-3 py-2">Events</th>
              <th className="px-3 py-2">Outcome evidence</th>
              <th className="px-3 py-2">Verified SOLD</th>
              <th className="px-3 py-2">Verified sale prices</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {market.towns.map((town) => (
              <tr key={town.town} className="border-t">
                <td className="px-3 py-2 font-medium">{town.town}</td>
                <td className="px-3 py-2">{town.historicalEvents}</td>
                <td className="px-3 py-2">{town.outcomeEvidence}</td>
                <td className="px-3 py-2">{town.verifiedSold}</td>
                <td className="px-3 py-2">{town.verifiedSalePrices}</td>
                <td className="px-3 py-2">{town.statistics.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
