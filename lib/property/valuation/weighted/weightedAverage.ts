import { ComparableWeight } from "./comparableWeights";

export function weightedAverage(

    comparables: ComparableWeight[]

): number {

    if (comparables.length === 0) {

        return 0;

    }

    let weightedTotal = 0;

    let totalWeight = 0;

    for (const comparable of comparables) {

        const weight =

            comparable.similarityScore *

            comparable.distanceWeight *

            comparable.ageWeight;

        weightedTotal +=

            comparable.salePrice * weight;

        totalWeight += weight;

    }

    return totalWeight === 0

        ? 0

        : weightedTotal / totalWeight;

}
