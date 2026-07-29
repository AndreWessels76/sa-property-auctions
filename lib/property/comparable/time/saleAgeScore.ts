export function calculateSaleAgeScore(

    months: number

): number {

    if (months <= 3) return 100;

    if (months <= 6) return 90;

    if (months <= 12) return 75;

    if (months <= 18) return 60;

    if (months <= 24) return 40;

    if (months <= 36) return 20;

    return 0;

}
