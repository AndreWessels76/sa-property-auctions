/**
 * Deterministic investor questions — not investment advice.
 */

import { II45_MINIMUM_COMPARABLE_SALES, II45_MINIMUM_MARKET_SALES } from "./config";
import type { InvestorQuestionAnswer, MarketEvidenceSummary } from "./types";

export function buildInvestorQuestions(input: {
  summary: MarketEvidenceSummary;
  comparableCount: number;
  comparableConfidence: string;
  previousAuctionCount: number;
  provenPriceCount: number;
}): InvestorQuestionAnswer[] {
  const questions: InvestorQuestionAnswer[] = [];

  questions.push({
    question: "Is there enough evidence to compare this property?",
    answer:
      input.comparableCount >= II45_MINIMUM_COMPARABLE_SALES
        ? "YES"
        : "NO",
    detail:
      input.comparableCount >= II45_MINIMUM_COMPARABLE_SALES
        ? [
            `${input.comparableCount} verified comparable sales`,
            `Comparable confidence: ${input.comparableConfidence}`,
          ]
        : [
            `Only ${input.comparableCount} verified comparable sale(s).`,
            `Minimum required: ${II45_MINIMUM_COMPARABLE_SALES}.`,
          ],
  });

  questions.push({
    question: "Is there enough evidence for an area median?",
    answer:
      input.summary.verifiedSalePriceCount >= II45_MINIMUM_MARKET_SALES
        ? "YES"
        : "NO",
    detail:
      input.summary.verifiedSalePriceCount >= II45_MINIMUM_MARKET_SALES
        ? [`${input.summary.verifiedSalePriceCount} verified sales`]
        : [
            `${input.summary.verifiedSalePriceCount} verified sales; minimum ${II45_MINIMUM_MARKET_SALES}`,
          ],
  });

  questions.push({
    question: "What is known about the previous auctions?",
    answer: input.previousAuctionCount > 0 ? "EVENTS_LINKED" : "NONE",
    detail:
      input.previousAuctionCount > 0
        ? [`${input.previousAuctionCount} auction event(s) on Property Master chain`]
        : ["No linked historical auction events"],
  });

  questions.push({
    question: "What prices are actually proven?",
    answer: input.provenPriceCount > 0 ? "VERIFIED_PRICES" : "NONE",
    detail:
      input.provenPriceCount > 0
        ? [`${input.provenPriceCount} verified sale price observation(s)`]
        : ["No verified sale prices — auction/guide/reserve are not sale prices"],
  });

  return questions;
}
