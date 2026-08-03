import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { formatAuctionDate } from "@/lib/format";
import {
  formatAuctionVenueDisplay,
  formatBuildingSize,
  formatLandSizeDisplay,
  getPropertyClassification,
  getVerificationStatusLabel,
  inferAuctionType,
} from "@/lib/property/detailExperience";
import { isFarmPropertyType } from "@/lib/property/agricultural";

type Props = {
  property: PropertyDTO;
};

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-navy-900">{value}</p>
    </div>
  );
}

export default function PropertySummarySection({ property }: Props) {
  const auctionType = inferAuctionType(property);
  const isFarm = isFarmPropertyType(property.property_type);
  const landSize = formatLandSizeDisplay(
    property.erf_size,
    property.agricultural_details,
  );
  const buildingSize = formatBuildingSize(property.floor_size);

  const items: Array<{ label: string; value: string }> = [
    {
      label: "Property classification",
      value: getPropertyClassification(property.property_type),
    },
    {
      label: "Verification status",
      value: getVerificationStatusLabel(property),
    },
    { label: "Auction type", value: auctionType },
    {
      label: "Auction venue",
      value: formatAuctionVenueDisplay(property.auction_venue, auctionType),
    },
    {
      label: "Auction date",
      value: property.auction_date
        ? formatAuctionDate(property.auction_date)
        : "Date to be confirmed with agency",
    },
    {
      label: "Auction time",
      value:
        property.auction_time?.trim() ||
        "Time to be confirmed with auction agency",
    },
    {
      label: "Agency",
      value:
        property.auction_agency ||
        property.source_name ||
        "Agency information pending",
    },
    {
      label: "Province",
      value: property.province?.trim() || "Province not yet recorded",
    },
    {
      label: "Town",
      value: property.town?.trim() || "Town not yet recorded",
    },
    {
      label: "Suburb",
      value: property.suburb?.trim() || "Suburb not published for this listing",
    },
  ];

  if (landSize) {
    items.push({ label: "Land size", value: landSize });
  }
  if (buildingSize) {
    items.push({ label: "Building size", value: buildingSize });
  }

  if (!isFarm) {
    if ((property.bedrooms ?? 0) > 0) {
      items.push({
        label: "Bedrooms",
        value: String(property.bedrooms),
      });
    }
    if ((property.bathrooms ?? 0) > 0) {
      items.push({
        label: "Bathrooms",
        value: String(property.bathrooms),
      });
    }
    if ((property.garages ?? 0) > 0) {
      items.push({
        label: "Garages",
        value: String(property.garages),
      });
    }
  }

  return (
    <section
      aria-labelledby="property-summary-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="property-summary-heading"
        className="text-xl font-bold text-navy-900"
      >
        Property summary
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Key facts at a glance — verified where available, otherwise clearly
        marked as pending confirmation.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <SummaryItem key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
