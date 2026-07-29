import {

ComparableProperty,

ComparableResult

} from "./comparableTypes";

import { basicComparableFilter } from "./comparableFilters";
import { calculateComparableScore } from "./comparableScoring";
import { rankComparables } from "./comparableRanking";

export function buildComparables(

    source: ComparableProperty,

    properties: ComparableProperty[]

): ComparableResult[] {

    const results = properties

        .filter(

            p => basicComparableFilter(source, p)

        )

        .map(

            property => ({

                property,

                score: calculateComparableScore(

                    source,

                    property

                ),

                reasons: []

            })

        );

    return rankComparables(results);

}
