import { withinRadius }

from "./radiusCalculator";

export function filterSelectedProperties(

    properties:any[],

    radius:number

){

    return properties.filter(

        property=>

            withinRadius(

                property.distanceKm,

                radius

            )

    );

}
