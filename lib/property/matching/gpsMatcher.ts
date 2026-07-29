export function gpsMatch(

    lat1: number | null,

    lon1: number | null,

    lat2: number | null,

    lon2: number | null

): boolean {

    if (

        lat1 === null ||

        lon1 === null ||

        lat2 === null ||

        lon2 === null

    ) {

        return false;

    }

    const tolerance = 0.0002;

    return (

        Math.abs(lat1 - lat2) < tolerance &&

        Math.abs(lon1 - lon2) < tolerance

    );

}