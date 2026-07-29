import { calculateAverageValue } from "./valuationCalculator";
import { calculateConfidence } from "./confidenceEngine";

export function estimateMarketValue(

    comparablePrices: number[]

) {

    const estimatedValue =

        calculateAverageValue(

            comparablePrices

        );

    const confidence =

        calculateConfidence(

            comparablePrices.length

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
