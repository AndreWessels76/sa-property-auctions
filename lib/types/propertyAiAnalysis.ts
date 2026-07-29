export type PropertyAiAnalysis = {
  id: string;
  property_id: string;
  score: number;
  confidence: number;
  summary: string;
  strengths: string[];
  risks: string[];
  buyer_profile: string[];
  estimated_discount: number | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
};
