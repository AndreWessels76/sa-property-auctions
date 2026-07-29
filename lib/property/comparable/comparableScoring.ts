import { ComparableProperty } from "./comparableTypes";

export function calculateComparableScore(

    source: ComparableProperty,

    candidate: ComparableProperty

) {

    let score = 0;

    if (source.suburb === candidate.suburb)
        score += 40;

    if (source.bedrooms === candidate.bedrooms)
        score += 20;

    if (source.bathrooms === candidate.bathrooms)
        score += 15;

    if (source.garages === candidate.garages)
        score += 10;

    if (source.propertyType === candidate.propertyType)
        score += 15;

    return score;

}
