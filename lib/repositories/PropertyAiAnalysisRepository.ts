import { BaseRepository } from "./BaseRepository";
import type { AIPropertyAnalysisDTO } from "@/lib/dto/AIPropertyAnalysisDTO";
import type { PropertyAiAnalysis } from "@/lib/types/propertyAiAnalysis";

export class PropertyAiAnalysisRepository extends BaseRepository {
  static toDTO(row: PropertyAiAnalysis): AIPropertyAnalysisDTO {
    return {
      score: Number(row.score),
      confidence: Number(row.confidence),
      summary: row.summary,
      strengths: row.strengths ?? [],
      risks: row.risks ?? [],
      buyerProfile: row.buyer_profile ?? [],
      estimatedDiscount:
        row.estimated_discount == null
          ? null
          : Number(row.estimated_discount),
    };
  }

  static async getByPropertyId(
    propertyId: string,
  ): Promise<PropertyAiAnalysis | null> {
    const db = this.publicDb();

    const { data, error } = await db
      .from("property_ai_analysis")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();

    if (error) {
      this.handleError("PropertyAiAnalysisRepository.getByPropertyId", error);
    }

    return data as PropertyAiAnalysis | null;
  }

  static async upsert(
    propertyId: string,
    analysis: AIPropertyAnalysisDTO,
    provider?: string | null,
  ): Promise<PropertyAiAnalysis> {
    const db = this.publicDb();

    const { data, error } = await db
      .from("property_ai_analysis")
      .upsert(
        {
          property_id: propertyId,
          score: analysis.score,
          confidence: analysis.confidence,
          summary: analysis.summary,
          strengths: analysis.strengths,
          risks: analysis.risks,
          buyer_profile: analysis.buyerProfile,
          estimated_discount: analysis.estimatedDiscount,
          provider: provider ?? process.env.AI_PROVIDER ?? "openai",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_id" },
      )
      .select("*")
      .single();

    if (error) {
      this.handleError("PropertyAiAnalysisRepository.upsert", error);
    }

    return data as PropertyAiAnalysis;
  }
}
