const OVERPASS_URL =
    "https://overpass-api.de/api/interpreter";

export async function queryOverpass(

    query:string

){

    const response = await fetch(

        OVERPASS_URL,

        {

            method:"POST",

            body:query

        }

    );

    return response.json();

}
