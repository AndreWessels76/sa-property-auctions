"use client";

import { Marker } from "react-map-gl/maplibre";
import { AMENITY_ICONS } from "@/lib/amenities/amenityIcons";

interface Props{

    latitude:number;

    longitude:number;

    category:keyof typeof AMENITY_ICONS;

}

export default function AmenityMarker({

    latitude,

    longitude,

    category

}:Props){

    return(

        <Marker

            latitude={latitude}

            longitude={longitude}

        >

            <div className="text-xl">

                {AMENITY_ICONS[category]}

            </div>

        </Marker>

    );

}
