interface Props{

    comparableCount:number;

}

export default function ComparableSalesCard({

    comparableCount

}:Props){

    return(

        <div className="rounded-xl border p-6">

            <h2>

                Comparable Sales

            </h2>

            <div className="text-3xl font-bold">

                {comparableCount}

            </div>

        </div>

    );

}
