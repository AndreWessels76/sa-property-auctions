export function calculateConfidence(

    comparableCount: number

): number {

    if (comparableCount >= 10) return 95;

    if (comparableCount >= 7) return 90;

    if (comparableCount >= 5) return 80;

    if (comparableCount >= 3) return 70;

    return 50;

}
