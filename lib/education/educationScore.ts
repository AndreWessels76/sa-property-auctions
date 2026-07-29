export function calculateEducationScore(

    schools:{

        educationScore:number;

        distanceKm:number;

    }[]

){

    if(schools.length===0)

        return 0;

    const weighted = schools.reduce(

        (sum,school)=>{

            const distanceWeight =

                school.distanceKm<=2

                    ?1

                    :0.75;

            return sum+

                school.educationScore*

                distanceWeight;

        },

        0

    );

    return Math.round(

        weighted/

        schools.length

    );

}
