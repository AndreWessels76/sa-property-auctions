interface Props{

    address:string;

    salePrice:number;

    distance:number;

    similarity:number;

}

export default function ComparablePopup({

    address,

    salePrice,

    distance,

    similarity

}:Props){

    return(

        <div className="rounded-lg bg-white shadow-lg p-4 w-64">

            <h3 className="font-bold">

                Comparable Sale

            </h3>

            <p>{address}</p>

            <p>

                Price:

                R{salePrice.toLocaleString()}

            </p>

            <p>

                Distance:

                {distance.toFixed(2)} km

            </p>

            <p>

                Similarity:

                {similarity}%

            </p>

        </div>

    );

}
