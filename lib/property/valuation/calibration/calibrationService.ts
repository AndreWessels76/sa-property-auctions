import { calculatePredictionError } from "./predictionError";

export function analyseCalibration(

    predicted: number,

    actual: number

){

    return calculatePredictionError(

        predicted,

        actual

    );

}
