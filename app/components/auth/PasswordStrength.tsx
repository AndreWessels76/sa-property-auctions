interface Props{

    password:string;

}

export default function PasswordStrength({

    password

}:Props){

    let strength="Weak";

    if(password.length>=8)
        strength="Medium";

    if(password.length>=12)
        strength="Strong";

    return(

        <p className="text-sm text-gray-600">

            Password Strength: {strength}

        </p>

    );

}
