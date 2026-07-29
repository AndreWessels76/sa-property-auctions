import { DEFAULT_WEIGHTS } from "./defaultWeights";

let cache = DEFAULT_WEIGHTS;

export function getWeights() {

    return cache;

}

export function setWeights(

    weights: typeof DEFAULT_WEIGHTS

) {

    cache = weights;

}
