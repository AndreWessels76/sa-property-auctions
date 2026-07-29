"use client";

import AmenityMarker from "./AmenityMarker";
import { Amenity } from "@/lib/amenities/amenityTypes";

interface Props{

    amenities:Amenity[];

}

export default function AmenityLayer({

    amenities

}:Props){

    return(

        <>

            {amenities.map(item=>(

                <AmenityMarker

                    key={item.id}

                    latitude={item.latitude}

                    longitude={item.longitude}

                    category={item.category}

                />

            ))}

        </>

    );

}
