export function normalizeAmenity(

    item:any,

    category:string

){

    return{

        name:

            item.tags?.name ??

            "Unknown",

        category,

        latitude:item.lat,

        longitude:item.lon,

        address:

            item.tags?.["addr:street"] ??

            null

    };

}
