export function calculateOccupancyRisk(

    occupied: boolean,

    tenant: boolean

): number {

    if (!occupied)
        return 5;

    if (tenant)
        return 30;

    return 60;

}
