import type { Property } from "@/lib/types/property";

export interface DuplicateResult {

    duplicate: boolean;

    confidence: number;

}

function normalize(text: string | null) {

    if (!text) return "";

    return text
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();

}

export function compareProperties(

    a: Property,

    b: Property

): DuplicateResult {

    let score = 0;

    if (
        normalize(a.address) ===
        normalize(b.address)
    )
        score += 40;

    if (
        normalize(a.town) ===
        normalize(b.town)
    )
        score += 15;

    if (
        normalize(a.province) ===
        normalize(b.province)
    )
        score += 10;

    if (
        normalize(a.property_type) ===
        normalize(b.property_type)
    )
        score += 10;

    if (
        a.auction_date ===
        b.auction_date
    )
        score += 10;

    const diff = Math.abs(
        a.estimated_value -
        b.estimated_value
    );

    if (
        diff <
        a.estimated_value * 0.05
    )
        score += 15;

    return {

        duplicate: score >= 80,

        confidence: score,

    };

}