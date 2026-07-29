import { PATTERNS } from "./parserPatterns";
import { extract } from "./parserRules";
import { ParsedAddress } from "./parserTypes";

export function parseAddress(

    address: string

): ParsedAddress {

    return {

        original: address,

        erfNumber: extract(PATTERNS.erf, address),

        portion: extract(PATTERNS.portion, address),

        plot: extract(PATTERNS.plot, address),

        farm: extract(PATTERNS.farm, address),

        unit: extract(PATTERNS.unit, address),

        complex: null,

        streetNumber: extract(PATTERNS.streetNumber, address),

        streetName: null,

        suburb: null,

        town: null,

        province: null,

        postalCode: extract(PATTERNS.postalCode, address)

    };

}