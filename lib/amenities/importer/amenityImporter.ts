import { queryOverpass } from "./overpassClient";
import { normalizeAmenity } from "./amenityNormalizer";

export async function importAmenities(

    query:string,

    category:string

){

    const result=

        await queryOverpass(query);

    return result.elements.map(

        (item:any)=>

        normalizeAmenity(

            item,

            category

        )

    );

}
