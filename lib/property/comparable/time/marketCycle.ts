export type MarketCycle =

    | "RISING"

    | "STABLE"

    | "DECLINING";

export function getMarketAdjustment(

    cycle: MarketCycle

): number {

    switch (cycle) {

        case "RISING":
            return 1.05;

        case "DECLINING":
            return 0.95;

        default:
            return 1.00;

    }

}
