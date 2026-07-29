"use client";

import { useState } from "react";

import { updatePassword }

from "@/lib/auth/updatePassword";

export default function ResetPasswordCard(){

    const [password,setPassword]=

        useState("");

    const [message,setMessage]=

        useState("");

    async function save(){

        const {error}=

            await updatePassword(password);

        if(error){

            setMessage(error.message);

        }else{

            setMessage(

                "Password updated successfully."

            );

        }

    }

    return(

        <div className="max-w-md mx-auto mt-20 bg-white rounded-xl shadow p-8">

            <h2 className="text-xl font-bold">

                Choose a New Password

            </h2>

            <input

                type="password"

                value={password}

                onChange={e=>

setPassword(e.target.value)}

                className="border rounded w-full p-3 mt-4"

            />

            <button

                onClick={save}

                className="w-full mt-4 bg-green-600 text-white rounded p-3"

            >

                Save Password

            </button>

            <p className="mt-4">

                {message}

            </p>

        </div>

    );

}
