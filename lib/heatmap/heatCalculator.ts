import { HeatPoint }

from "./heatTypes";

export function buildHeatPoints(

    properties:any[]

):HeatPoint[]{

    return properties.map(property=>({

        latitude:property.latitude,

        longitude:property.longitude,

        weight:

            property.opportunity_score/100,

        category:"auction"

    }));

}
