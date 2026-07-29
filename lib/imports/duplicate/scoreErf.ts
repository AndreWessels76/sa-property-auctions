export function scoreErf(

    a: string,

    b: string

){

    if(!a || !b){

        return 0;

    }

    return a===b ? 100 : 0;

}