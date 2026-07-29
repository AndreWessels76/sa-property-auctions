export function distanceScore(

    distanceKm: number

): number {

    if (distanceKm <= 0.5) return 30;

    if (distanceKm <= 1) return 25;

    if (distanceKm <= 2) return 20;

    if (distanceKm <= 5) return 10;

    return 0;

}
