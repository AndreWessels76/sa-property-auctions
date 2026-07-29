import { Amenity } from "@/lib/amenities/amenityTypes";

interface Props{

    amenities:Amenity[];

}

export default function NearbyAmenitiesCard({

    amenities

}:Props){

    return(

        <div className="rounded-xl border p-6">

            <h2 className="font-bold mb-4">

                Nearby Amenities

            </h2>

            <ul className="space-y-2">

                {amenities.map(item=>(

                    <li key={item.id}>

                        {item.name}

                        {" - "}

                        {item.distanceKm.toFixed(1)} km

                    </li>

                ))}

            </ul>

        </div>

    );

}
