interface Props{

    recommendation:string;

}

export default function RecommendationCard({

    recommendation

}:Props){

    return(

        <div className="rounded-xl border bg-blue-50 p-6">

            <h2>

                AI Recommendation

            </h2>

            <p>

                {recommendation}

            </p>

        </div>

    );

}