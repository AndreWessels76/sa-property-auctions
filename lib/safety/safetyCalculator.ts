import { CRIME_WEIGHTS }

from "./crimeCategories";

export function calculateSafetyScore(

    violent:number,

    property:number,

    burglary:number,

    vehicle:number

){

    const weighted=

        violent*CRIME_WEIGHTS.violentCrime+

        property*CRIME_WEIGHTS.propertyCrime+

        burglary*CRIME_WEIGHTS.burglary+

        vehicle*CRIME_WEIGHTS.vehicleCrime;

    return Math.max(

        0,

        Math.round(100-weighted)

    );

}
