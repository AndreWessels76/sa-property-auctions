interface Props{

    score:number;

}

export default function EducationCard({

    score

}:Props){

    return(

        <div className="rounded-xl border p-6 bg-white">

            <h2 className="font-bold">

                Education Score

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
