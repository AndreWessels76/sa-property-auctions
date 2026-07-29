export function scoreTitle(

    a:string,

    b:string

){

    a=a.toLowerCase();

    b=b.toLowerCase();

    if(a===b){

        return 100;

    }

    if(

        a.includes(b)||

        b.includes(a)

    ){

        return 70;

    }

    return 0;

}