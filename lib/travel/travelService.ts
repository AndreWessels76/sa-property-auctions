import { calculateAccessibilityScore }

from "./accessibilityScore";

export function buildAccessibility(

    routes:any[]

){

    return{

        score:

            calculateAccessibilityScore(

                routes

            ),

        routes

    };

}
