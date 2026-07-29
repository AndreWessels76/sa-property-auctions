interface Props{

    legal:number;

    repair:number;

    finance:number;

    market:number;

}

export default function RiskCard({

    legal,

    repair,

    finance,

    market

}:Props){

    return(

        <div className="rounded-xl border p-6">

            <h2>

                Risk Analysis

            </h2>

            <ul className="space-y-2">

                <li>Legal: {legal}</li>

                <li>Repair: {repair}</li>

                <li>Finance: {finance}</li>

                <li>Market: {market}</li>

            </ul>

        </div>

    );

}