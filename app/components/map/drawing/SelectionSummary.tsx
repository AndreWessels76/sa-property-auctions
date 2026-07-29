interface Props{

    count:number;

    averageOpportunity:number;

    averageInvestment:number;

}

export default function SelectionSummary({

    count,

    averageOpportunity,

    averageInvestment

}:Props){

    return(

        <div className="rounded-xl border p-6">

            <h2>

                Selected Area

            </h2>

            <p>

                Properties: {count}

            </p>

            <p>

                Avg Opportunity:

                {averageOpportunity.toFixed(1)}

            </p>

            <p>

                Avg Investment:

                {averageInvestment.toFixed(1)}

            </p>

        </div>

    );

}
