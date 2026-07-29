"use client";

import { ComparableMapProperty } from "@/lib/maps/comparableTypes";
import ComparableMarker from "./ComparableMarker";

interface Props{

    comparables: ComparableMapProperty[];

}

export default function ComparableLayer({

    comparables

}:Props){

    return(

        <>

            {comparables.map(property=>(

                <ComparableMarker

                    key={property.id}

                    latitude={property.latitude}

                    longitude={property.longitude}

                />

            ))}

        </>

    );

}
