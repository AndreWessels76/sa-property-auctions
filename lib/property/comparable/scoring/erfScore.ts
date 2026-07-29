export function erfSizeScore(

    source: number | null,

    candidate: number | null

): number {

    if (!source || !candidate) return 0;

    const difference =

        Math.abs(source - candidate) / source;

    if (difference <= 0.05) return 15;

    if (difference <= 0.10) return 10;

    if (difference <= 0.20) return 5;

    return 0;

}
