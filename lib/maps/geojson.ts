export function pointFeature(

    latitude:number,

    longitude:number

){

    return{

        type:"Feature",

        geometry:{

            type:"Point",

            coordinates:[

                longitude,

                latitude

            ]

        }

    };

}
