import LoginHeader from "./LoginHeader";
import LoginForm from "./LoginForm";
import GoogleLoginButton from "./GoogleLoginButton";
import AuthDivider from "./AuthDivider";
import AuthFooter from "./AuthFooter";

export default function LoginCard(){

    return(

        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">

            <LoginHeader/>

            <LoginForm/>

            <AuthDivider/>

            <GoogleLoginButton/>

            <AuthFooter/>

        </div>

    );

}
