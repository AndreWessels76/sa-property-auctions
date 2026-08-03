import {
  AGRICULTURAL_FIELD_LABELS,
  formatAgriculturalValue,
  hasAgriculturalContent,
  type AgriculturalDetails,
} from "@/lib/property/agricultural";

type Props = {
  details: AgriculturalDetails | null | undefined;
};

const ORDER: Array<keyof AgriculturalDetails> = [
  "farmCategory",
  "totalHectares",
  "arableHectares",
  "grazingHectares",
  "irrigatedHectares",
  "waterRights",
  "dams",
  "boreholes",
  "livestockFacilities",
  "farmHouses",
  "outbuildings",
  "electricity",
  "fencing",
  "pivotIrrigation",
  "cropInformation",
  "gameFarm",
  "vatStatus",
  "additionalImprovements",
];

/**
 * Dedicated agricultural section — only mount for Farm property types.
 * Never mixes with residential bed/bath/garage specs.
 */
export default function AgriculturalDetailsSection({ details }: Props) {
  if (!hasAgriculturalContent(details)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-lg font-bold text-navy-900">
          Agricultural information
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Detailed farm attributes have not been recorded for this listing yet.
          Confirm hectares, water, and improvements with the auction agency
          before bidding.
        </p>
      </div>
    );
  }

  const rows = ORDER.flatMap((key) => {
    const formatted = formatAgriculturalValue(key, details?.[key] ?? null);
    if (!formatted) return [];
    return [{ key, label: AGRICULTURAL_FIELD_LABELS[key], value: formatted }];
  });

  return (
    <div>
      <h3 className="text-lg font-bold text-navy-900">
        Agricultural information
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {row.label}
            </p>
            <p className="mt-1 font-semibold text-navy-900">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
