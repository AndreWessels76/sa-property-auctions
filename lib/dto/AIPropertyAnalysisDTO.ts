export interface AIPropertyAnalysisDTO {
  score: number;
  confidence: number;
  summary: string;
  strengths: string[];
  risks: string[];
  buyerProfile: string[];
  estimatedDiscount: number | null;
}
