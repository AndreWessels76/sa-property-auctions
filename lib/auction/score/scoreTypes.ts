export interface OpportunityScore {

    totalScore: number;

    valueScore: number;

    discountScore: number;

    confidenceScore: number;

    comparableScore: number;

    liquidityScore: number;

    rating:
        | "Excellent"
        | "Good"
        | "Average"
        | "High Risk";

}