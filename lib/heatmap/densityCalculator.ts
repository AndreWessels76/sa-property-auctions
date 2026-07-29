export function calculateDensity(

    propertyCount:number,

    radiusKm:number

){

    if(radiusKm<=0)

        return 0;

    return propertyCount/radiusKm;

}
