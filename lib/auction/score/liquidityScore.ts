export function calculateLiquidityScore(

    propertyType:string

){

    switch(propertyType){

        case "Apartment":

            return 15;

        case "Townhouse":

            return 14;

        case "Residential":

            return 13;

        case "VacantLand":

            return 9;

        case "Farm":

            return 6;

        default:

            return 10;

    }

}
