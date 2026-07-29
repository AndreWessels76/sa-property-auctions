interface Props{

    enabled:boolean;

    onToggle:()=>void;

}

export default function SatelliteToggle({

    enabled,

    onToggle

}:Props){

    return(

        <button

            onClick={onToggle}

            className="border rounded px-3 py-2"

        >

            {

                enabled

                ? "Disable Satellite"

                : "Enable Satellite"

            }

        </button>

    );

}
