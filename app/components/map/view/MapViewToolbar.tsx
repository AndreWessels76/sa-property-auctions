import MapStyleSelector from "./MapStyleSelector";

interface Props{

    style:string;

    onStyleChange:(style:string)=>void;

}

export default function MapViewToolbar({

    style,

    onStyleChange

}:Props){

    return(

        <div className="rounded-lg bg-white shadow p-4 flex gap-4">

            <MapStyleSelector

                style={style}

                onChange={onStyleChange}

            />

        </div>

    );

}
