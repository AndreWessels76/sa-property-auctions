import PropertyMapLazy from "@/app/components/map/PropertyMapLazy";
import type { ComparableMapProperty } from "@/lib/maps/comparableTypes";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { shouldHideExactLocation } from "@/lib/property/detailExperience";

type Props = {
  property: PropertyDTO;
  comparables: ComparableMapProperty[];
};

export default function PropertyLocationSection({
  property,
  comparables,
}: Props) {
  const hasCoords =
    property.latitude != null &&
    property.longitude != null &&
    Number.isFinite(property.latitude) &&
    Number.isFinite(property.longitude);

  const hideExact = shouldHideExactLocation(property);

  return (
    <section
      aria-labelledby="property-location-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="property-location-heading"
        className="text-xl font-bold text-navy-900"
      >
        Location
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Interactive map with comparable context. Nearby amenities such as
        schools and hospitals require third-party map enrichment and are not
        inferred here.
      </p>

      {!hasCoords ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
          A map pin is not available because coordinates have not been verified
          for this listing. Use the town and province details when researching
          the area, and confirm the exact stand or farm portion with the agency.
        </p>
      ) : hideExact ? (
        <>
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Exact street location is withheld for this listing. The map shows an
            approximate area only — contact the agency for precise access
            details.
          </p>
          <div className="mt-4">
            <PropertyMapLazy
              latitude={property.latitude!}
              longitude={property.longitude!}
              comparables={comparables.filter((sale) =>
                Number.isFinite(sale.distanceKm),
              )}
            />
          </div>
        </>
      ) : (
        <div className="mt-4">
          <PropertyMapLazy
            latitude={property.latitude!}
            longitude={property.longitude!}
            comparables={comparables.filter((sale) =>
              Number.isFinite(sale.distanceKm),
            )}
          />
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Satellite and street-level views depend on your map provider coverage in
        this area. Always verify access routes and municipal zoning independently.
      </p>
    </section>
  );
}
