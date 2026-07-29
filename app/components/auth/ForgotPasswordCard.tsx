"use client";

import { useState } from "react";
import { resetPassword } from "@/lib/auth/resetPassword";

export default function ForgotPasswordCard(){

    const [email,setEmail]=useState("");

    const [message,setMessage]=useState("");

    async function submit(){

        const {error}=

            await resetPassword(email);

        if(error){

            setMessage(error.message);

        }else{

            setMessage(

                "Password reset email sent."

            );

        }

    }

    return(

        <div className="max-w-md mx-auto mt-20 bg-white rounded-xl shadow p-8">

            <h2 className="text-xl font-bold mb-4">

                Forgot Password

            </h2>

            <input

                type="email"

                className="border rounded w-full p-3"

                value={email}

                onChange={e=>setEmail(e.target.value)}

                placeholder="Email"

            />

            <button

                onClick={submit}

                className="mt-4 bg-blue-600 text-white w-full rounded p-3"

            >

                Send Reset Email

            </button>

            <p className="mt-4">

                {message}

            </p>

        </div>

    );

}
