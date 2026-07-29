const cache = new Map();

export function getCached(

    address: string

){

    return cache.get(address);

}

export function setCached(

    address: string,

    value: unknown

){

    cache.set(address, value);

}
