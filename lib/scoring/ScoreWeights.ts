export const ScoreWeights = {
  marketValue: 0.3,
  auctionValue: 0.2,
  location: 0.15,
  dataQuality: 0.1,
  propertyFeatures: 0.1,
  auctionRisk: 0.1,
  liquidity: 0.05,
} as const;

export type ScoreWeightKey = keyof typeof ScoreWeights;
