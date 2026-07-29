import { calculateSafetyScore }

from "./safetyCalculator";

export function buildSafetyAnalysis(

    data:any

){

    return{

        score:

            calculateSafetyScore(

                data.violentCrime,

                data.propertyCrime,

                data.burglary,

                data.vehicleCrime

            )

    };

}
