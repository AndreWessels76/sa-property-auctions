interface Props{

    enabled:boolean;

    onToggle:()=>void;

}

export default function HeatControls({

    enabled,

    onToggle

}:Props){

    return(

        <button

            onClick={onToggle}

            className="rounded border px-4 py-2"

        >

            {

                enabled

                ? "Hide Heat Map"

                : "Show Heat Map"

            }

        </button>

    );

}
