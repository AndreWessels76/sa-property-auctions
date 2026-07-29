export interface MapMarker{

    id:string;

    latitude:number;

    longitude:number;

    title:string;

    type:
        |"property"
        |"comparable"
        |"school"
        |"hospital"
        |"shopping"
        |"police"
        |"custom";

}
