import { calculateDynamicAdjustment }

from "./featureMultiplier";

export function applyDynamicAdjustments(

    estimatedValue:number,

    province:string,

    enabledFeatures:string[]

){

    let adjustment=0;

    for(const feature of enabledFeatures){

        adjustment+=

        calculateDynamicAdjustment(

            estimatedValue,

            province,

            feature as any

        );

    }

    return estimatedValue+adjustment;

}
