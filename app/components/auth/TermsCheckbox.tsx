interface Props{

    checked:boolean;

    onChange:(value:boolean)=>void;

}

export default function TermsCheckbox({

    checked,

    onChange

}:Props){

    return(

        <label className="flex gap-2 text-sm">

            <input

                type="checkbox"

                checked={checked}

                onChange={e=>onChange(e.target.checked)}

            />

            I accept the Terms & Conditions

        </label>

    );

}
