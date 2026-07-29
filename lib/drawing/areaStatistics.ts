import { SelectedProperty }

from "./drawingTypes";

export function calculateAreaStatistics(

    properties:SelectedProperty[]

){

    if(properties.length===0){

        return{

            count:0,

            averageOpportunity:0,

            averageInvestment:0,

            averageMarketValue:0

        };

    }

    const count=properties.length;

    const averageOpportunity=

        properties.reduce(

            (sum,p)=>sum+p.opportunityScore,

            0

        )/count;

    const averageInvestment=

        properties.reduce(

            (sum,p)=>sum+p.investmentScore,

            0

        )/count;

    const averageMarketValue=

        properties.reduce(

            (sum,p)=>sum+p.marketValue,

            0

        )/count;

    return{

        count,

        averageOpportunity,

        averageInvestment,

        averageMarketValue

    };

}
