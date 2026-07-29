import { TravelTime }

from "@/lib/travel/travelTypes";

interface Props{

    routes:TravelTime[];

}

export default function TravelCard({

    routes

}:Props){

    return(

        <div className="rounded-xl border p-6">

            <h2 className="font-bold mb-4">

                Travel Times

            </h2>

            <ul className="space-y-2">

                {routes.map(route=>(

                    <li key={route.destination}>

                        {route.destination}

                        {" - "}

                        {route.durationMinutes} min

                    </li>

                ))}

            </ul>

        </div>

    );

}
