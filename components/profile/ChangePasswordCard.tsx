import Link from "next/link";

export default function ChangePasswordCard(){

    return(

        <div className="rounded-xl border bg-white p-6">

            <h2>

                Security

            </h2>

            <Link

                href="/reset-password"

            >

                Change Password

            </Link>

        </div>

    );

}
