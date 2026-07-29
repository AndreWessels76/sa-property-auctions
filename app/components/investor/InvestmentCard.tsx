interface Props{

    investmentScore:number;

}

export default function InvestmentCard({

    investmentScore

}:Props){

    return(

        <div className="rounded-xl border p-6">

            <h2>

                Investment Score

            </h2>

            <div className="text-4xl font-bold">

                {investmentScore}

            </div>

        </div>

    );

}