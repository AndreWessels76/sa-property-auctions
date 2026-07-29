export function calculateLegalRisk(

    hasCourtOrder: boolean,

    titleVerified: boolean,

    pendingLitigation: boolean

): number {

    let risk = 0;

    if (!titleVerified)
        risk += 30;

    if (pendingLitigation)
        risk += 40;

    if (!hasCourtOrder)
        risk += 20;

    return Math.min(risk, 100);

}