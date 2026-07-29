import { calibrationFactor } from "./weightCalibration";

export function recalibrateValue(

    estimatedValue: number,

    averageError: number

){

    return estimatedValue *

        calibrationFactor(

            averageError

        );

}
