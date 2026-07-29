import { AIImageAnalysis } from "./aiTypes";

export async function analyzeImage(

    imageUrl: string

): Promise<AIImageAnalysis> {

    /**
     * Provider word later hier ingesit
     */

    return {

        roomType: "unknown",

        confidence: 0,

        qualityScore: 0,

        watermarkDetected: false,

        containsPeople: false,

        containsText: false,

        heroBonus: 0

    };

}