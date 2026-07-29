type Handler =

(payload: Record<string, unknown>)

=> Promise<void>;

const registry = new Map<string, Handler>();

export function registerHandler(

type: string,

handler: Handler

){

    registry.set(type, handler);

}

export function getHandler(

type: string

){

    return registry.get(type);

}
