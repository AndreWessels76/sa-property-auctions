import { dequeue } from "./imageQueue";
import { processImage } from "./imagePipeline";

export async function startWorker() {

    while (true) {

        const job = dequeue();

        if (!job) {

            await new Promise(resolve => setTimeout(resolve, 1000));

            continue;

        }

        await processImage(job);

    }

}