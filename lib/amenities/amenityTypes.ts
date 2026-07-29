export interface Amenity{

    id:string;

    name:string;

    category:
        |"school"
        |"hospital"
        |"shopping"
        |"police"
        |"fuel"
        |"bank"
        |"park"
        |"transport"
        |"restaurant";

    latitude:number;

    longitude:number;

    distanceKm:number;

}
