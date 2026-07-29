interface Props{

    radius:number;

}

export default function RadiusCircle({

    radius

}:Props){

    return(

        <div className="absolute bottom-4 left-4 rounded-lg bg-white p-3 shadow">

            Search Radius

            <br/>

            {radius} km

        </div>

    );

}
