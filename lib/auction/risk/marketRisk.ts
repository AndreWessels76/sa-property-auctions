export function calculateMarketRisk(

    annualGrowth: number

): number {

    if (annualGrowth >= 10)
        return 5;

    if (annualGrowth >= 5)
        return 15;

    if (annualGrowth >= 0)
        return 25;

    return 45;

}