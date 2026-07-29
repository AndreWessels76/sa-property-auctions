export function calculatePredictionError(

    predicted: number,

    actual: number

) {

    const errorAmount = actual - predicted;

    const errorPercentage =

        (errorAmount / actual) * 100;

    return {

        errorAmount,

        errorPercentage

    };

}
