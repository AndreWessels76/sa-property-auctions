import { calculateOverallRisk }

from "./riskCalculator";

export function buildInvestmentScore(

    opportunityScore: number,

    risks: number[]

){

    const overallRisk =

        calculateOverallRisk(

            risks

        );

    return {

        investmentScore:

            opportunityScore -

            overallRisk,

        overallRisk

    };

}