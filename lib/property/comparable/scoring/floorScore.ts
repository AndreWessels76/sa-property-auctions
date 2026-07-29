export function floorSizeScore(

    source: number | null,

    candidate: number | null

): number {

    if (!source || !candidate) return 0;

    const difference =

        Math.abs(source - candidate) / source;

    if (difference <= 0.05) return 20;

    if (difference <= 0.10) return 15;

    if (difference <= 0.20) return 10;

    return 0;

}
