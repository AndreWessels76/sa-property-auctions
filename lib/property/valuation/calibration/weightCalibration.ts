export function calibrationFactor(

    averageError: number

): number {

    if (Math.abs(averageError) <= 2)

        return 1.00;

    if (averageError > 0)

        return 1.02;

    return 0.98;

}
