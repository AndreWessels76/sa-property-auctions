export interface HeroCandidate {

    id: string;

    image_type: string | null;

    quality_score: number;

    width: number;

    height: number;

    ai_score?: number;

}

export interface HeroScoreBreakdown {

    total: number;

    category: number;

    quality: number;

    resolution: number;

    aspect: number;

    ai: number;

}

export const CATEGORY_SCORE: Record<string, number> = {

    front: 100,

    street: 90,

    garden: 80,

    lounge: 75,

    kitchen: 70,

    bedroom: 60,

    bathroom: 50,

    garage: 40,

    rear: 30,

    floorplan: 10,

    unknown: 0

};

function resolutionScore(
    width: number,
    height: number
) {

    const pixels = width * height;

    if (pixels > 3000000)
        return 30;

    if (pixels > 2000000)
        return 20;

    if (pixels > 1000000)
        return 10;

    return 0;

}

function aspectRatioScore(
    width: number,
    height: number
) {

    const ratio = width / height;

    if (ratio > 1.2 && ratio < 1.8)
        return 10;

    return 0;

}

export function calculateHeroScore(
    image: HeroCandidate
) {

    const category =
        CATEGORY_SCORE[
            image.image_type ?? "unknown"
        ] ?? 0;

    return (
        category +
        image.quality_score +
        resolutionScore(
            image.width,
            image.height
        ) +
        aspectRatioScore(
            image.width,
            image.height
        ) +
        (image.ai_score ?? 0)
    );

}

export function selectBestHero(
    images: HeroCandidate[]
) {

    return [...images]
        .sort(
            (a, b) =>
                calculateHeroScore(b) -
                calculateHeroScore(a)
        )[0];

}