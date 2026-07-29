interface Props{

    score:number;

}

export default function AccessibilityCard({

    score

}:Props){

    return(

        <div className="rounded-xl border bg-green-50 p-6">

            <h2>

                Accessibility Score

            </h2>

            <div className="text-5xl font-bold">

                {score}

            </div>

        </div>

    );

}
