import type { PropertyIntelligenceDTO } from "@/lib/dto/PropertyIntelligenceDTO";

type Props = {
  intelligence: PropertyIntelligenceDTO;
};

const ratingStyles: Record<
  PropertyIntelligenceDTO["dealRating"],
  string
> = {
  Excellent: "bg-emerald-100 text-emerald-800",
  Good: "bg-blue-100 text-blue-800",
  Average: "bg-amber-100 text-amber-800",
  Risky: "bg-red-100 text-red-800",
};

export default function PropertyIntelligenceCard({ intelligence }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-navy-900">
        Property Intelligence
      </h2>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Investment Score
          </p>
          <div className="mt-1 flex items-end gap-3">
            <span className="text-4xl font-bold text-navy-900">
              {intelligence.investmentScore}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${ratingStyles[intelligence.dealRating]}`}
            >
              {intelligence.dealRating}
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">Confidence</p>
          <p className="mt-1 text-4xl font-bold text-navy-900">
            {intelligence.confidence}%
          </p>
        </div>
      </div>

      {intelligence.badges.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-500">Badges</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {intelligence.badges.map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-navy-900"
              >
                <span aria-hidden>{badge.emoji}</span>
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {intelligence.estimatedRentalYield != null ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-500">Rental Yield</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">
            {intelligence.estimatedRentalYield.toFixed(1)}%
          </p>
        </div>
      ) : null}

      {intelligence.recommendations.length > 0 ? (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="text-sm font-medium text-slate-500">
            Recommendations
          </p>
          <ul className="mt-3 space-y-2">
            {intelligence.recommendations.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <span className="mt-0.5 text-emerald-600" aria-hidden>
                  ✔
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
