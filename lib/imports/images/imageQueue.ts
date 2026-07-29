interface QueueItem{

    propertyId:string;

    imageUrl:string;

}

const queue:QueueItem[]=[];

export function enqueueImage(

item:QueueItem

){

    queue.push(item);

}

export function dequeueImage(){

    return queue.shift();

}

export function queueLength(){

    return queue.length;

}