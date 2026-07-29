export function bedroomScore(

    source: number,

    candidate: number

): number {

    if (source === candidate) return 10;

    if (Math.abs(source - candidate) === 1) return 5;

    return 0;

}
