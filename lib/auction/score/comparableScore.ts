export function calculateComparableScore(

    comparableCount:number

){

    if(comparableCount>=10) return 20;

    if(comparableCount>=7) return 16;

    if(comparableCount>=5) return 12;

    if(comparableCount>=3) return 8;

    return 4;

}
