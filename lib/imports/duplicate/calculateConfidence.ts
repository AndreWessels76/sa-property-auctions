import { PropertyModel } from "../normalizer/PropertyModel";

import { scoreAddress } from "./scoreAddress";

import { scoreCoordinates } from "./scoreCoordinates";

import { scoreErf } from "./scoreErf";

import { scoreTitle } from "./scoreTitle";

export function calculateConfidence(

incoming:PropertyModel,

existing:PropertyModel

){

    const address=

        scoreAddress(

            incoming.address,

            existing.address

        );

    const erf=

        scoreErf(

            incoming.erfNumber,

            existing.erfNumber

        );

    const gps=

        scoreCoordinates(

            incoming.latitude,

            incoming.longitude,

            existing.latitude,

            existing.longitude

        );

    const title=

        scoreTitle(

            incoming.title,

            existing.title

        );

    return (

        address*0.35+

        erf*0.35+

        gps*0.20+

        title*0.10

    );

}