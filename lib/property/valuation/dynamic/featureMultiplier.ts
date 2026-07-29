import { FEATURE_PERCENTAGES }

from "./percentageAdjustments";

import { REGION_MULTIPLIERS }

from "./regionalAdjustments";

import { luxuryMultiplier }

from "./luxuryAdjustments";

export function calculateDynamicAdjustment(

    estimatedValue:number,

    province:string,

    feature:keyof typeof FEATURE_PERCENTAGES

){

    const featureWeight=

        FEATURE_PERCENTAGES[feature];

    const region=

        REGION_MULTIPLIERS[
            province as keyof typeof REGION_MULTIPLIERS
        ] ?? 1;

    const luxury=

        luxuryMultiplier(

            estimatedValue

        );

    return estimatedValue

        * featureWeight

        * region

        * luxury;

}
