export function calculateAverageValue(

    salePrices: number[]

): number {

    if (salePrices.length === 0) {

        return 0;

    }

    const total = salePrices.reduce(

        (sum, value) => sum + value,

        0

    );

    return total / salePrices.length;

}
