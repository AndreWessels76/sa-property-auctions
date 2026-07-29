import { calculateDiscountScore } from "./discountScore";
import { calculateConfidenceScore } from "./confidenceScore";
import { calculateComparableScore } from "./comparableScore";
import { calculateLiquidityScore } from "./liquidityScore";

export function calculateOpportunityScore(

    marketValue:number,

    auctionPrice:number,

    confidence:number,

    comparableCount:number,

    propertyType:string

){

    const discountScore=

        calculateDiscountScore(

            marketValue,

            auctionPrice

        );

    const confidenceScore=

        calculateConfidenceScore(

            confidence

        );

    const comparableScore=

        calculateComparableScore(

            comparableCount

        );

    const liquidityScore=

        calculateLiquidityScore(

            propertyType

        );

    return (

        discountScore+

        confidenceScore+

        comparableScore+

        liquidityScore

    );

}
