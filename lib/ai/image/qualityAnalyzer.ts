export function calculateQuality(

    width: number,

    height: number,

    aiScore: number

){

    const pixels=

        width*height;

    let score=0;

    if(pixels>3000000)

        score+=30;

    if(aiScore>80)

        score+=40;

    return score;

}