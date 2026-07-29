interface Log{

    level:string;

    message:string;

    created_at:string;

}

export default function LiveConsole({

logs

}:{

logs:Log[]

}){

return(

<div className="rounded-2xl bg-slate-950 p-6 text-green-400 shadow">

<h2 className="mb-5 text-xl font-bold text-white">

Live Console

</h2>

<div className="space-y-2 font-mono text-sm">

{logs.map((log,index)=>(

<div key={index}>

[{log.level}] {log.message}

</div>

))}

</div>

</div>

);

}