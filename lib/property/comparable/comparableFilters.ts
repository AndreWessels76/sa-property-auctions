import { ComparableProperty } from "./comparableTypes";

export function basicComparableFilter(

    source: ComparableProperty,

    candidate: ComparableProperty

) {

    if (source.id === candidate.id) return false;

    if (source.province !== candidate.province) return false;

    if (source.propertyType !== candidate.propertyType) return false;

    return true;

}
