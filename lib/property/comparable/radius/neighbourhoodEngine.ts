import { RADIUS_RULES } from "./radiusRules";

export function getNeighbourhoodRadius(

    propertyType: string | null

): number {

    if (!propertyType) {

        return 2;

    }

    return (

        RADIUS_RULES[

            propertyType as keyof typeof RADIUS_RULES

        ] ?? 2

    );

}
