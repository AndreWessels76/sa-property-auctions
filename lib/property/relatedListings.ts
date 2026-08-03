import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { PropertyService } from "@/lib/services";

export type RelatedListingGroup = {
  title: string;
  listings: PropertyDTO[];
};

export async function getRelatedListingGroups(
  property: PropertyDTO,
): Promise<RelatedListingGroup[]> {
  const limit = 4;
  const groups: RelatedListingGroup[] = [];

  const [sameProvince, sameType, sameTown] = await Promise.all([
    property.province
      ? PropertyService.search({
          province: property.province,
          pageSize: limit + 1,
          sort: "auction",
        })
      : Promise.resolve({ data: [] as PropertyDTO[] }),
    property.property_type
      ? PropertyService.search({
          propertyType: property.property_type,
          pageSize: limit + 1,
          sort: "auction",
        })
      : Promise.resolve({ data: [] as PropertyDTO[] }),
    property.town
      ? PropertyService.search({
          town: property.town,
          pageSize: limit + 1,
          sort: "auction",
        })
      : Promise.resolve({ data: [] as PropertyDTO[] }),
  ]);

  const excludeCurrent = (items: PropertyDTO[]) =>
    items.filter((item) => item.id !== property.id).slice(0, limit);

  const provinceListings = excludeCurrent(sameProvince.data);
  if (provinceListings.length > 0) {
    groups.push({
      title: `More auctions in ${property.province}`,
      listings: provinceListings,
    });
  }

  const typeListings = excludeCurrent(sameType.data);
  if (typeListings.length > 0) {
    groups.push({
      title: `Similar ${property.property_type ?? "property"} listings`,
      listings: typeListings,
    });
  }

  const townListings = excludeCurrent(sameTown.data);
  if (townListings.length > 0 && property.town !== property.province) {
    groups.push({
      title: `Nearby auctions in ${property.town}`,
      listings: townListings,
    });
  }

  const agency = property.auction_agency?.trim();
  if (agency) {
    const agencySearch = await PropertyService.search({
      search: agency,
      pageSize: limit + 1,
      sort: "auction",
    });
    const agencyListings = excludeCurrent(agencySearch.data);
    if (agencyListings.length > 0) {
      groups.push({
        title: `More from ${agency}`,
        listings: agencyListings,
      });
    }
  }

  const seen = new Set<string>();
  const deduped: RelatedListingGroup[] = [];
  for (const group of groups) {
    const listings = group.listings.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    if (listings.length > 0) {
      deduped.push({ ...group, listings });
    }
  }

  return deduped.slice(0, 3);
}
