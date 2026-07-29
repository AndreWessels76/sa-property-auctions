interface Props{

    style:string;

    onChange:(style:string)=>void;

}

export default function MapStyleSelector({

    style,

    onChange

}:Props){

    return(

        <select

            value={style}

            onChange={event=>

                onChange(event.target.value)

            }

            className="border rounded p-2"

        >

            <option value="street">

                Street

            </option>

            <option value="satellite">

                Satellite

            </option>

            <option value="hybrid">

                Hybrid

            </option>

        </select>

    );

}
