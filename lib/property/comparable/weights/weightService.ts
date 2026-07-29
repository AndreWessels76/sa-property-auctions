import { getWeights } from "./weightCache";

export function getWeight(

    name: keyof ReturnType<typeof getWeights>

) {

    return getWeights()[name];

}
