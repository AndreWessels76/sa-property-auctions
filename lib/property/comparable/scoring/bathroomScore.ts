export function bathroomScore(

    source: number,

    candidate: number

): number {

    if (source === candidate) return 8;

    if (Math.abs(source - candidate) === 1) return 4;

    return 0;

}
