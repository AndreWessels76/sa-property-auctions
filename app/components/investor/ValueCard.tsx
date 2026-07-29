interface Props{

    value:number;

    confidence:number;

}

export default function ValueCard({

    value,

    confidence

}:Props){

    return(

        <div className="rounded-xl border p-6 bg-white shadow">

            <h2 className="text-xl font-bold">

                AI Market Value

            </h2>

            <div className="text-4xl font-bold text-green-600">

                R{value.toLocaleString()}

            </div>

            <p>

                Confidence {confidence}%

            </p>

        </div>

    );

}