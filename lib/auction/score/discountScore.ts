export function calculateDiscountScore(

    marketValue: number,

    auctionPrice: number

): number {

    if (marketValue <= 0) return 0;

    const discount =

        ((marketValue - auctionPrice)

        / marketValue) * 100;

    if (discount >= 35) return 30;

    if (discount >= 25) return 25;

    if (discount >= 15) return 18;

    if (discount >= 10) return 12;

    return 5;

}
