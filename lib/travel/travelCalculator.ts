import { TravelTime } from "./travelTypes";

export function averageTravelTime(

    routes:TravelTime[]

){

    if(routes.length===0)

        return 0;

    return routes.reduce(

        (sum,item)=>

            sum+item.durationMinutes,

        0

    )/routes.length;

}
