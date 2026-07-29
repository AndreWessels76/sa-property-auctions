export function luxuryMultiplier(

    estimatedValue: number

){

    if(estimatedValue>=10000000)

        return 1.50;

    if(estimatedValue>=5000000)

        return 1.25;

    if(estimatedValue>=2500000)

        return 1.10;

    return 1.00;

}
