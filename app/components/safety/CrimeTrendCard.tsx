interface Props{

    trend:string;

}

export default function CrimeTrendCard({

    trend

}:Props){

    return(

        <div className="rounded-xl border p-6">

            <h2>

                Crime Trend

            </h2>

            <p>

                {trend}

            </p>

        </div>

    );

}
