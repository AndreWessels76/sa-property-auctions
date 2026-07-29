export interface ImageQuality {

    score: number;

    rating: string;

}

export function calculateImageQuality(

    width: number,

    height: number,

    bytes: number

): ImageQuality {

    let score = 0;

    // Resolution

    if(width >= 1600)
        score += 40;

    else if(width >= 1200)
        score += 30;

    else if(width >= 800)
        score += 20;

    // Height

    if(height >= 900)
        score += 20;

    else if(height >= 600)
        score += 10;

    // File Size

    if(bytes > 400000)
        score += 20;

    else if(bytes > 200000)
        score += 10;

    // Aspect Ratio

    const ratio = width / height;

    if(ratio > 1.1 && ratio < 1.8)
        score += 20;

    let rating = "Poor";

    if(score >= 90)
        rating = "Excellent";

    else if(score >= 70)
        rating = "Very Good";

    else if(score >= 50)
        rating = "Good";

    else if(score >= 30)
        rating = "Average";

    return {

        score,

        rating,

    };

}