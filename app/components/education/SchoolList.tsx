import { School }

from "@/lib/education/educationTypes";

interface Props{

    schools:School[];

}

export default function SchoolList({

    schools

}:Props){

    return(

        <div className="rounded-xl border p-6">

            <h2 className="font-bold mb-4">

                Nearby Schools

            </h2>

            <ul className="space-y-2">

                {schools.map(

                    school=>(

                        <li key={school.id}>

                            {school.name}

                            {" - "}

                            {school.distanceKm.toFixed(1)} km

                        </li>

                    )

                )}

            </ul>

        </div>

    );

}
