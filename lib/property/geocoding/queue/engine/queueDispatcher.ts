import { getHandler }

from "./queueRegistry";

export async function dispatch(

job: {

type: string;

payload: Record<string, unknown>;

}

){

    const handler=

        getHandler(job.type);

    if(!handler){

        throw new Error(

            "No handler registered"

        );

    }

    await handler(

        job.payload

    );

}
