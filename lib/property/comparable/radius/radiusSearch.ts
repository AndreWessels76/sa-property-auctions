import { calculateDistance } from "./distanceCalculator";

export function isWithinRadius(

    lat1: number,

    lon1: number,

    lat2: number,

    lon2: number,

    radiusKm: number

): boolean {

    return (

        calculateDistance(

            lat1,

            lon1,

            lat2,

            lon2

        ) <= radiusKm

    );

}
