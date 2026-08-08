import Link from "next/link";
import { PropertyService } from "@/lib/services";
import { buildDueDiligenceCentre } from "@/lib/property/dueDiligence";
import DueDiligenceExtractionActions from "./DueDiligenceExtractionActions";

/**
 * Due Diligence Extraction queue — deterministic completeness only.
 */
export default async function DueDiligenceExtractionPanel() {
  let properties: Awaited<ReturnType<typeof PropertyService.getProperties>> = [];
  try {
    properties = await PropertyService.getProperties();
  } catch {
    properties = [];
  }

  const rows = properties.slice(0, 25).map((p) => {
    const centre = buildDueDiligenceCentre(p);
    const present = centre.items.filter(
      (i) =>
        i.status === "verified" ||
        i.status === "source_confirmed" ||
        i.status === "extracted",
    ).length;
    return {
      id: p.id,
      title: p.title,
      source: p.source_name,
      sourceUrl: p.source_url,
      fieldsFound: present,
      fieldsMissing: centre.summary.notSuppliedCount + centre.summary.notFoundCount,
      documentsFound: centre.documents.length,
      conflicts: centre.conflicts.length,
      completeness: centre.completeness.overall,
      status: centre.conflicts.length > 0 ? "conflicts" : "ready",
    };
  });

  return (
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Due Diligence Extraction</h2>
          <p className="mt-1 text-sm text-slate-300">
            Re-run deterministic extraction against verified catalogue source
            fields. Never fabricates missing legal/municipal facts.
          </p>
        </div>
        <DueDiligenceExtractionActions />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-2 py-2">Property</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Fields</th>
              <th className="px-2 py-2">Missing</th>
              <th className="px-2 py-2">Docs</th>
              <th className="px-2 py-2">Conflicts</th>
              <th className="px-2 py-2">Completeness</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-700/80">
                <td className="px-2 py-2 max-w-[14rem] truncate font-medium">
                  {row.title}
                </td>
                <td className="px-2 py-2">{row.source ?? "—"}</td>
                <td className="px-2 py-2">{row.fieldsFound}</td>
                <td className="px-2 py-2">{row.fieldsMissing}</td>
                <td className="px-2 py-2">{row.documentsFound}</td>
                <td className="px-2 py-2">{row.conflicts}</td>
                <td className="px-2 py-2">{row.completeness}%</td>
                <td className="px-2 py-2 capitalize">{row.status}</td>
                <td className="px-2 py-2 space-x-2 whitespace-nowrap">
                  <Link
                    href={`/properties/${row.id}`}
                    className="underline text-gold-400"
                  >
                    Open
                  </Link>
                  {row.sourceUrl ? (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-sky-300"
                    >
                      Source
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
