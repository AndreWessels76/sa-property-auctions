export function scoreCoordinates(

    lat1:number|null,

    lon1:number|null,

    lat2:number|null,

    lon2:number|null

){

    if(

        lat1===null ||

        lat2===null ||

        lon1===null ||

        lon2===null

    ){

        return 0;

    }

    const diff =

        Math.abs(lat1-lat2)+

        Math.abs(lon1-lon2);

    if(diff<0.0005){

        return 100;

    }

    if(diff<0.002){

        return 70;

    }

    return 0;

}