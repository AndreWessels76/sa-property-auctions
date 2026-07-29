import { ComparableResult } from "./comparableTypes";

export function rankComparables(

    results: ComparableResult[]

) {

    return results.sort(

        (a, b) => b.score - a.score

    );

}
