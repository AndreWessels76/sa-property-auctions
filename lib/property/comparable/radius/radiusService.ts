import { getNeighbourhoodRadius } from "./neighbourhoodEngine";
import { filterByRadius } from "./geoFilters";
import { ComparableProperty } from "../comparableTypes";

export function findNearbyComparables(

    source: ComparableProperty,

    candidates: ComparableProperty[]

) {

    const radius = getNeighbourhoodRadius(

        source.propertyType

    );

    return filterByRadius(

        source,

        candidates,

        radius

    );

}
