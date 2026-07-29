"use client";

import { useState } from "react";

interface Props{

    value:string;

    onChange:(value:string)=>void;

}

export default function PasswordInput({

    value,

    onChange

}:Props){

    const [show,setShow]=useState(false);

    return(

        <div>

            <input

                type={show?"text":"password"}

                value={value}

                onChange={e=>onChange(e.target.value)}

                className="w-full rounded border p-3"

                placeholder="Password"

            />

            <button

                type="button"

                onClick={()=>setShow(!show)}

                className="mt-2 text-sm text-blue-600"

            >

                {show?"Hide":"Show"} password

            </button>

        </div>

    );

}
