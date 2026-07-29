import { calculateSaleAge } from "./saleAgeCalculator";
import { calculateSaleAgeScore } from "./saleAgeScore";

export function analyseSaleDate(

    saleDate: Date

) {

    const age =

        calculateSaleAge(saleDate);

    return {

        ...age,

        score:

            calculateSaleAgeScore(

                age.months

            )

    };

}
