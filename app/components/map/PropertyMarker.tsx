"use client";

import { Marker } from "react-map-gl/maplibre";

interface Props{

    latitude:number;

    longitude:number;

}

export default function PropertyMarker({

    latitude,

    longitude

}:Props){

    return(

        <Marker

            latitude={latitude}

            longitude={longitude}

        >

            <div className="text-3xl">

                🏠

            </div>

        </Marker>

    );

}
