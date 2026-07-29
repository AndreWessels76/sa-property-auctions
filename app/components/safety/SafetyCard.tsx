interface Props{

    score:number;

}

export default function SafetyCard({

    score

}:Props){

    return(

        <div className="rounded-xl border p-6 bg-white">

            <h2 className="font-bold">

                Safety Score

            </h2>

            <div className="text-5xl font-bold">

                {score}

            </div>

            <p>

                out of 100

            </p>

        </div>

    );

}
