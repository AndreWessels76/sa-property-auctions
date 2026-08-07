import { formatAuctionDate } from "@/lib/format";
import type { TimelineEvent } from "@/lib/property/propertyTimeline";

type Props = {
  events: TimelineEvent[];
};

export default function PropertyTimelineSection({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <section
      aria-labelledby="property-timeline-heading"
      className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2
        id="property-timeline-heading"
        className="text-lg font-bold text-navy-900"
      >
        Property Timeline
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Verified events only — historical states are retained, not deleted.
      </p>
      <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
        {events.map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-gold-500 ring-2 ring-white" />
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {formatAuctionDate(event.at)} · {event.category}
            </p>
            <p className="text-sm font-semibold text-navy-900">{event.title}</p>
            {event.detail ? (
              <p className="text-xs text-slate-600">{event.detail}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
