import RegisterHeader from "./RegisterHeader";
import RegisterForm from "./RegisterForm";
import GoogleLoginButton from "./GoogleLoginButton";
import AuthDivider from "./AuthDivider";
import RegisterFooter from "./RegisterFooter";

export default function RegisterCard(){

    return(

        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">

            <RegisterHeader/>

            <RegisterForm/>

            <AuthDivider/>

            <GoogleLoginButton/>

            <RegisterFooter/>

        </div>

    );

}
