export function removeOutliers(

    prices: number[]

): number[] {

    if (prices.length < 5) {

        return prices;

    }

    const sorted = [...prices].sort(

        (a, b) => a - b

    );

    return sorted.slice(

        1,

        sorted.length - 1

    );

}
