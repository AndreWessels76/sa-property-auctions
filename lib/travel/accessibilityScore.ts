import { TravelTime } from "./travelTypes";

export function calculateAccessibilityScore(

    routes:TravelTime[]

){

    let score=100;

    routes.forEach(route=>{

        if(route.durationMinutes>30)

            score-=15;

        else if(route.durationMinutes>20)

            score-=10;

        else if(route.durationMinutes>10)

            score-=5;

    });

    return Math.max(score,0);

}
