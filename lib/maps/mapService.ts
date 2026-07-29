import { MapMarker } from "./mapTypes";

export function getVisibleMarkers(

    markers:MapMarker[]

){

    return markers.filter(

        marker=>marker.latitude&&marker.longitude

    );

}
