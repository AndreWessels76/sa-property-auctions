import Link from "next/link";

export default function AuthFooter(){

    return(

        <div className="mt-6 text-center text-sm">

            <Link href="/register">

                Create an account

            </Link>

        </div>

    );

}
