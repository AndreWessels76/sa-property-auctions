interface Props{

    checked:boolean;

    onChange:(value:boolean)=>void;

}

export default function RememberMe({

    checked,

    onChange

}:Props){

    return(

        <label className="flex items-center gap-2">

            <input

                type="checkbox"

                checked={checked}

                onChange={e=>onChange(e.target.checked)}

            />

            Remember me

        </label>

    );

}
