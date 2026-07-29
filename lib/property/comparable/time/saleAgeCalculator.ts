export function calculateSaleAge(

    saleDate: Date,

    referenceDate: Date = new Date()

) {

    const milliseconds =

        referenceDate.getTime() -

        saleDate.getTime();

    const days =

        Math.floor(

            milliseconds /

            (1000 * 60 * 60 * 24)

        );

    return {

        days,

        months: days / 30.44,

        years: days / 365.25

    };

}
