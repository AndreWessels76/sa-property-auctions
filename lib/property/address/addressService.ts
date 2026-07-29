import { normalizeAddress } from "./addressNormalizer";
import { normalizeProvince } from "./provinceNormalizer";
import { titleCase } from "./addressFormatter";

export function processAddress(

    address: string,

    province: string | null

) {

    const normalized = normalizeAddress(address);

    return {

        normalized,

        formatted: titleCase(normalized),

        province: normalizeProvince(province)

    };

}