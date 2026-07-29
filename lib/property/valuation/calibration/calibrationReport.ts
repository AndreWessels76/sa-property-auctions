export function buildCalibrationReport(

    averageError: number,

    sampleSize: number

){

    return {

        averageError,

        sampleSize,

        status:

            Math.abs(averageError) <= 5

                ? "Healthy"

                : "Needs Calibration"

    };

}
