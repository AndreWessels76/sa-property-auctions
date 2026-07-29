export function calculateOpportunityWeight(

    score:number

){

    if(score>=90)

        return 1.0;

    if(score>=80)

        return 0.8;

    if(score>=70)

        return 0.6;

    if(score>=60)

        return 0.4;

    return 0.2;

}
