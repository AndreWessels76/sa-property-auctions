import { estimateMarketValue } from "./valuationEngine";

export function valuateProperty(

    prices: number[]

) {

    return estimateMarketValue(prices);

}
