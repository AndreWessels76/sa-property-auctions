import { buildPropertyHighlights } from "@/lib/property/detailExperience";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

type Props = {
  property: PropertyDTO;
};

export default function PropertyHighlightsSection({ property }: Props) {
  const highlights = buildPropertyHighlights(property);

  if (highlights.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="property-highlights-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="property-highlights-heading"
        className="text-xl font-bold text-navy-900"
      >
        Property highlights
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Standout features drawn from verified listing data — no inferred
        amenities.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <span className="text-xl" aria-hidden>
              {item.icon}
            </span>
            <span className="text-sm font-semibold text-navy-900">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
