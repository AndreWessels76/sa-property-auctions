export function weightedReasons(

    comparableCount: number,

    confidence: number

): string[] {

    return [

        `Weighted valuation using ${comparableCount} comparable sales`,

        `Overall confidence: ${confidence}%`,

        `Distance and similarity weighting applied`

    ];

}
