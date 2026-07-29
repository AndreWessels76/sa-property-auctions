export function calculateRepairRisk(

    estimatedRepairCost: number,

    marketValue: number

): number {

    if (marketValue <= 0)
        return 0;

    const percentage =

        (estimatedRepairCost /

        marketValue) * 100;

    if (percentage <= 5)
        return 5;

    if (percentage <= 10)
        return 15;

    if (percentage <= 20)
        return 30;

    return 50;

}