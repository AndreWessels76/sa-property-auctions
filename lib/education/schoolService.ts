import {

    calculateEducationScore

}

from "./educationScore";

export function buildEducationAnalysis(

    schools:any[]

){

    return{

        score:

            calculateEducationScore(

                schools

            ),

        schools

    };

}
