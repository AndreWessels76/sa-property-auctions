import { calculateOpportunityScore } from "./scoreCalculator";

export function buildOpportunity(

    data:{

        marketValue:number;

        auctionPrice:number;

        confidence:number;

        comparableCount:number;

        propertyType:string;

    }

){

    const total=

        calculateOpportunityScore(

            data.marketValue,

            data.auctionPrice,

            data.confidence,

            data.comparableCount,

            data.propertyType

        );

    return {

        score: total,

        rating:

            total>=85

            ? "Excellent"

            : total>=70

            ? "Good"

            : total>=50

            ? "Average"

            : "High Risk"

    };

}
