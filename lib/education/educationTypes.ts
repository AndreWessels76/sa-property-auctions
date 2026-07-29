export interface School{

    id:string;

    name:string;

    phase:"Primary"|"Secondary"|"Combined";

    sector:"Public"|"Private";

    latitude:number;

    longitude:number;

    distanceKm:number;

    educationScore:number;

}
