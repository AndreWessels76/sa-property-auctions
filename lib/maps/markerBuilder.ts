import { MapMarker } from "./mapTypes";

export function buildPropertyMarker(

    id:string,

    latitude:number,

    longitude:number,

    title:string

):MapMarker{

    return{

        id,

        latitude,

        longitude,

        title,

        type:"property"

    };

}
