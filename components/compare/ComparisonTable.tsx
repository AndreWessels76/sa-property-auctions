"use client";

import Link from "next/link";
import type { PropertyComparison } from "@/lib/intelligence/propertyComparison";
import { NOT_SUPPLIED } from "@/lib/intelligence/notSupplied";

const GROUP_LABEL: Record<string, string> = {
  property: "Property",
  auction: "Auction",
  pricing: "Pricing (supplied fields only)",
  agricultural: "Agricultural",
};

export default function ComparisonTable({
  comparison,
  premium,
}: {
  comparison: PropertyComparison;
  premium: boolean;
}) {
  if (!comparison.properties.length) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Select upcoming or live verified listings to compare. Expired auctions
        stay in historical records and are hidden from this public comparison.
      </p>
    );
  }

  const groups = ["property", "auction", "pricing", "agricultural"] as const;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[640px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-navy-900 text-white">
            <th className="sticky left-0 z-10 bg-navy-900 px-4 py-3 text-left font-semibold">
              Field
            </th>
            {comparison.properties.map((p) => (
              <th key={p.id} className="px-4 py-3 text-left font-semibold">
                <Link href={p.href} className="underline decoration-gold-400">
                  {p.title}
                </Link>
                <p className="mt-1 text-xs font-normal text-slate-300">
                  {p.verification_state === "verified"
                    ? "Verified"
                    : p.verification_state ?? "Not supplied"}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) => {
            const rows = comparison.rows.filter((r) => r.group === group);
            if (!rows.length) return [];
            return [
              <tr key={`g-${group}`} className="bg-slate-50">
                <td
                  colSpan={comparison.properties.length + 1}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  {GROUP_LABEL[group]}
                </td>
              </tr>,
              ...rows.map((row) => (
                <tr key={row.key} className="border-t border-slate-100">
                  <th className="sticky left-0 bg-white px-4 py-3 text-left font-medium text-slate-700">
                    {row.label}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={`${row.key}-${comparison.properties[i]?.id ?? i}`}
                      className={`px-4 py-3 ${cell.supplied ? "text-navy-900" : "text-slate-400 italic"}`}
                    >
                      {cell.supplied ? cell.text : NOT_SUPPLIED}
                    </td>
                  ))}
                </tr>
              )),
            ];
          })}
        </tbody>
      </table>
      {!premium ? (
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Free comparison is limited to {comparison.limit} listings and basic
          fields.{" "}
          <Link href="/pricing" className="font-semibold text-navy-900 underline">
            Upgrade for land size, documents, and agricultural rows
          </Link>
          .
        </p>
      ) : null}
      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        {comparison.methodology} This is decision support, not investment advice.
      </p>
    </div>
  );
}
