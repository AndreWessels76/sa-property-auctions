import { addressMatch } from "./addressMatcher";
import { erfMatch } from "./erfMatcher";
import { gpsMatch } from "./gpsMatcher";
import { calculateConfidence } from "./confidenceCalculator";
import { MatchResult, PropertyRecord } from "./matchingTypes";

export function matchProperties(

    a: PropertyRecord,

    b: PropertyRecord

): MatchResult {

    const address = addressMatch(

        a.address,

        b.address

    );

    const erf = erfMatch(

        a.erfNumber,

        b.erfNumber

    );

    const gps = gpsMatch(

        a.latitude,

        a.longitude,

        b.latitude,

        b.longitude

    );

    const title =

        a.titleDeed !== null &&

        a.titleDeed === b.titleDeed;

    const confidence = calculateConfidence(

        address,

        erf,

        gps,

        title

    );

    return {

        matched: confidence >= 70,

        confidence,

        reasons: [

            ...(address ? ["Address"] : []),

            ...(erf ? ["Erf"] : []),

            ...(gps ? ["GPS"] : []),

            ...(title ? ["Title Deed"] : [])

        ]

    };

}