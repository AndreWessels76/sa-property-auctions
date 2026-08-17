import { PermissionService, SessionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";
import AciNav from "../AciNav";
import AciPropertyIntelligenceCard from "../AciPropertyIntelligenceCard";
import type { AciWorkspaceFilters } from "@/lib/aci/productLayer";

export const dynamic = "force-dynamic";

export default async function AciWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();
  const params = await searchParams;
  const filters: AciWorkspaceFilters = {
    province: str(params.province),
    town: str(params.town),
    propertyType: str(params.propertyType),
    evidenceState: str(params.evidenceState),
    outcomeFilter: (str(params.outcomeFilter) as AciWorkspaceFilters["outcomeFilter"]) ?? null,
    auctionDateFrom: str(params.auctionDateFrom),
    auctionDateTo: str(params.auctionDateTo),
  };
  const page = Number(str(params.page) ?? "1") || 1;
  const workspace = await AciCommandCentreService.workspace(filters, page);

  return (
    <div>
      <AciNav current="/admin/aci/workspace" />
      <h1 className="text-3xl font-bold">Investor research workspace</h1>
      <p className="mt-1 text-slate-600">DISCOVER → RESEARCH → COMPARE → DECIDE → DOSSIER → MONITOR</p>
      <p className="mt-1 text-sm text-slate-500">No fake statistics. Insufficient data is shown as insufficient.</p>

      <form className="mt-4 grid gap-2 rounded-2xl border bg-white p-4 text-sm md:grid-cols-4">
        <select name="province" defaultValue={filters.province ?? ""} className="rounded border px-2 py-1">
          <option value="">Province</option>
          {workspace.facets.provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select name="town" defaultValue={filters.town ?? ""} className="rounded border px-2 py-1">
          <option value="">Town</option>
          {workspace.facets.towns.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select name="propertyType" defaultValue={filters.propertyType ?? ""} className="rounded border px-2 py-1">
          <option value="">Property type</option>
          {workspace.facets.types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select name="outcomeFilter" defaultValue={filters.outcomeFilter ?? ""} className="rounded border px-2 py-1">
          <option value="">All outcomes</option>
          <option value="SOLD">SOLD</option>
          <option value="SOLD_WITHOUT_PRICE">SOLD_WITHOUT_PRICE</option>
          <option value="OUTCOME_MISSING">OUTCOME_MISSING</option>
          <option value="VERIFIED_SALE_PRICE">VERIFIED_SALE_PRICE</option>
          <option value="INSUFFICIENT_DATA">INSUFFICIENT_DATA</option>
        </select>
        <input name="auctionDateFrom" type="date" defaultValue={filters.auctionDateFrom ?? ""} className="rounded border px-2 py-1" />
        <input name="auctionDateTo" type="date" defaultValue={filters.auctionDateTo ?? ""} className="rounded border px-2 py-1" />
        <select name="evidenceState" defaultValue={filters.evidenceState ?? ""} className="rounded border px-2 py-1">
          <option value="">Evidence state</option>
          {[...new Set(workspace.rows.map((r) => r.evidenceState))].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white">Filter</button>
      </form>

      <p className="mt-3 text-sm text-slate-500">
        {workspace.total} events · page {workspace.page}/{workspace.totalPages}
      </p>

      {workspace.rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border bg-white p-6 text-slate-600">INSUFFICIENT_DATA — no matching events.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {workspace.rows.map((row) => (
            <AciPropertyIntelligenceCard
              key={row.observationId}
              card={{
                id: row.id,
                title: row.title,
                address: row.address,
                town: row.town,
                suburb: row.suburb,
                propertyType: row.propertyType,
                bedrooms: row.bedrooms,
                bathrooms: row.bathrooms,
                garages: row.garages,
                auctionDate: row.auctionDate,
                source: row.source,
                sourceUrl: row.sourceUrl,
                evidenceBadge: row.evidenceBadge,
                outcomeState: row.outcomeState,
                salePriceState: row.salePriceState,
                quality: row.quality,
                lastEvidenceUpdate: row.lastEvidenceUpdate,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function str(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value?.trim() ? value : null;
}
