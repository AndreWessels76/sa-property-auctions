export function saleAgeScore(

    months: number

) {

    if (months <= 3) return 10;

    if (months <= 6) return 8;

    if (months <= 12) return 5;

    return 2;

}
