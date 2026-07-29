import Link from "next/link";

export default function RegisterFooter(){

    return(

        <div className="mt-6 text-center text-sm">

            Already have an account?

            <br/>

            <Link href="/login">

                Login

            </Link>

        </div>

    );

}
