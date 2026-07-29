import { PropertyFeatures } from "./featureTypes";

export function featureScore(

    features: PropertyFeatures

): number {

    return Object.values(features)

        .filter(Boolean)

        .length;

}
