export function marketTrendWeight(

    annualGrowth:number

){

    if(annualGrowth>=12)

        return 1;

    if(annualGrowth>=8)

        return 0.8;

    if(annualGrowth>=5)

        return 0.6;

    if(annualGrowth>=2)

        return 0.4;

    return 0.2;

}
