import { weightedAverage } from "./weightedAverage";
import { weightedConfidence } from "./weightedConfidence";
import { ComparableWeight } from "./comparableWeights";

export function buildWeightedValuation(

    comparables: ComparableWeight[]

) {

    const estimatedValue =

        weightedAverage(comparables);

    const confidence =

        weightedConfidence(

            comparables.map(

                c => c.similarityScore

            )

        );

    return {

        estimatedValue,

        confidence,

        minimumValue:

            estimatedValue * 0.95,

        maximumValue:

            estimatedValue * 1.05

    };

}
