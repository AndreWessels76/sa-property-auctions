export function formatCoordinates(

    latitude: number,

    longitude: number

){

    return {

        latitude:

            Number(latitude.toFixed(6)),

        longitude:

            Number(longitude.toFixed(6))

    };

}
