export function weightedConfidence(

    similarityScores: number[]

): number {

    if (similarityScores.length === 0) {

        return 0;

    }

    const average =

        similarityScores.reduce(

            (sum, score) => sum + score,

            0

        ) / similarityScores.length;

    return Math.min(

        99,

        Math.round(average)

    );

}
