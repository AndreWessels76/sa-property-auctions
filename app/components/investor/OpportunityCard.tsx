interface Props{

    score:number;

    rating:string;

}

export default function OpportunityCard({

    score,

    rating

}:Props){

    return(

        <div className="rounded-xl border p-6">

            <h2>

                Opportunity Score

            </h2>

            <div className="text-5xl font-bold">

                {score}

            </div>

            <p>

                {rating}

            </p>

        </div>

    );

}