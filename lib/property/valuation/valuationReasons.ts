export function buildReasons(

    comparableCount: number,

    confidence: number

): string[] {

    return [

        `${comparableCount} comparable properties analysed`,

        `Confidence score: ${confidence}%`

    ];

}
