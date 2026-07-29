import { Amenity } from "./amenityTypes";

export function calculateAmenityScore(

    amenities:Amenity[]

){

    let score=0;

    amenities.forEach(item=>{

        if(item.distanceKm<=1)

            score+=10;

        else if(item.distanceKm<=2)

            score+=5;

        else if(item.distanceKm<=5)

            score+=2;

    });

    return Math.min(score,100);

}
