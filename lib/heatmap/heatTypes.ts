export interface HeatPoint{

    latitude:number;

    longitude:number;

    weight:number;

    category:
        |"auction"
        |"roi"
        |"growth"
        |"risk";

}
