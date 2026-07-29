export function calculateConfidence(

    address: boolean,

    erf: boolean,

    gps: boolean,

    title: boolean

): number {

    let score = 0;

    if (address) score += 40;

    if (erf) score += 30;

    if (gps) score += 20;

    if (title) score += 10;

    return score;

}