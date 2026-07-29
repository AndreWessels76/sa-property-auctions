"use client";

interface Props{

    radiusKm:number;

}

export default function RadiusOverlay({

    radiusKm

}:Props){

    return(

        <div>

            Radius:

            {radiusKm} km

        </div>

    );

}
