interface Props{

    radius:number;

    onChange:(value:number)=>void;

}

export default function RadiusSelector({

    radius,

    onChange

}:Props){

    return(

        <div className="rounded-lg border bg-white p-4">

            <label>

                Radius

            </label>

            <input

                type="range"

                min={1}

                max={20}

                value={radius}

                onChange={event=>

                    onChange(

                        Number(event.target.value)

                    )

                }

            />

            <p>

                {radius} km

            </p>

        </div>

    );

}
