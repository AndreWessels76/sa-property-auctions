interface Props{

    progress:number;

    step:string;

    processed:number;

    total:number;

}

export default function JobProgressCard({

    progress,

    step,

    processed,

    total

}:Props){

return(

<div className="rounded-2xl bg-white p-6 shadow">

<h2 className="mb-4 text-xl font-bold">

Running Import

</h2>

<div className="h-4 rounded-full bg-slate-200">

<div

style={{

width:`${progress}%`

}}

className="h-full rounded-full bg-green-500"

/>

</div>

<p className="mt-4">

{step}

</p>

<p>

{processed} / {total}

</p>

</div>

);

}