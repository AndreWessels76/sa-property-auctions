import { ImageJob } from "./queueTypes";

const queue: ImageJob[] = [];

export function enqueue(job: ImageJob) {

    queue.push(job);

}

export function dequeue() {

    return queue.shift();

}

export function queueSize() {

    return queue.length;

}