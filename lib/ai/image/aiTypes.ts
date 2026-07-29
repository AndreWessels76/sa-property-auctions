export interface AIImageAnalysis {

    roomType: string;

    confidence: number;

    qualityScore: number;

    watermarkDetected: boolean;

    containsPeople: boolean;

    containsText: boolean;

    heroBonus: number;

}