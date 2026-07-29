import type { Property } from "@/lib/types/property";
import { normalizeAddress } from "./address";
import { normalizeTown } from "./towns";
import { validateProvince } from "./provinceValidator";

import {
  normalizeProvince,
  normalizePropertyType,
  normalizeTitle,
  titleCase,
} from "./normalizers";

export function cleanProperty(
  property: Property
): Property {

  return {

    ...property,

    title:
    normalizeTitle(property.title),

    province: validateProvince(
        normalizeTown(property.town),
        normalizeProvince(property.province)
    ),

    town:
    normalizeTown(property.town),

    suburb:
      property.suburb
        ? titleCase(property.suburb)
        : null,

    property_type:
      normalizePropertyType(
        property.property_type
      ),

    address: normalizeAddress(property.address),

  };

}