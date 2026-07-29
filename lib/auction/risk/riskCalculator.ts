export function calculateOverallRisk(

    risks: number[]

): number {

    if (risks.length === 0)
        return 0;

    const total =

        risks.reduce(

            (sum, risk) => sum + risk,

            0

        );

    return Math.round(

        total / risks.length

    );

}