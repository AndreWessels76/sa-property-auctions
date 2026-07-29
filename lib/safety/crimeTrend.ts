export function determineCrimeTrend(

    previous:number,

    current:number

){

    if(current<previous)

        return "Improving";

    if(current>previous)

        return "Declining";

    return "Stable";

}
