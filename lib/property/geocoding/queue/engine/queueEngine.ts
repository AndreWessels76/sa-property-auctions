import { dispatch }

from "./queueDispatcher";

export async function processJob(

job:any

){

    await dispatch(job);

}
