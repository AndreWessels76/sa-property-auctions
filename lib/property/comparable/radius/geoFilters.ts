import { ComparableProperty } from "../comparableTypes";
import { isWithinRadius } from "./radiusSearch";

export function filterByRadius(

    source: ComparableProperty,

    candidates: ComparableProperty[],

    radiusKm: number

) {

    return candidates.filter(candidate => {

        if (

            source.latitude == null ||

            source.longitude == null ||

            candidate.latitude == null ||

            candidate.longitude == null

        ) {

            return false;

        }

        return isWithinRadius(

            source.latitude,

            source.longitude,

            candidate.latitude,

            candidate.longitude,

            radiusKm

        );

    });

}
