export interface TravelTime {

    destination:string;

    category:string;

    distanceKm:number;

    durationMinutes:number;

    transportMode:
        | "driving"
        | "walking"
        | "cycling";

}
