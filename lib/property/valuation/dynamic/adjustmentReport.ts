export function buildAdjustmentReport(

    adjustments:

    {

        feature:string;

        value:number;

    }[]

){

    return adjustments.map(

        adjustment=>

        `${adjustment.feature}: +R${adjustment.value.toFixed(0)}`

    );

}
