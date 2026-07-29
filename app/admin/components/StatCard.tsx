interface Props {

    title: string;

    value: string | number;

}

export default function StatCard({

    title,

    value,

}: Props){

    return(

        <div className="rounded-2xl bg-white p-6 shadow">

            <div className="text-sm text-slate-500">

                {title}

            </div>

            <div className="mt-3 text-4xl font-bold">

                {value}

            </div>

        </div>

    );

}