interface Props{

    name:string;

    distance:number;

    category:string;

}

export default function AmenityPopup({

    name,

    distance,

    category

}:Props){

    return(

        <div className="rounded-lg bg-white shadow-lg p-4">

            <h3 className="font-bold">

                {name}

            </h3>

            <p>{category}</p>

            <p>

                {distance.toFixed(2)} km

            </p>

        </div>

    );

}
