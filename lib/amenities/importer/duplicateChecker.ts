export function removeDuplicates(

    amenities:any[]

){

    const seen = new Set();

    return amenities.filter(item=>{

        const key=

            `${item.name}-${item.latitude}-${item.longitude}`;

        if(seen.has(key))

            return false;

        seen.add(key);

        return true;

    });

}
