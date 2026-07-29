export interface ScoreBreakdown {
  overall: number;
  marketValue: number;
  auctionValue: number;
  location: number;
  dataQuality: number;
  propertyFeatures: number;
  auctionRisk: number;
  liquidity: number;
  confidence: number;
  reasons: string[];
}

export interface InvestmentScoreResult {
  score: number;
  confidence: number;
  breakdown: ScoreBreakdown;
}
