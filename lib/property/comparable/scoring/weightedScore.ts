export function totalComparableScore(

    scores: number[]

) {

    return scores.reduce(

        (total, score) => total + score,

        0

    );

}
