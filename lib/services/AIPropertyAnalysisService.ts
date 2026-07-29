import { unstable_cache } from "next/cache";
import { buildPropertyAnalysisPayload } from "@/lib/ai/buildPropertyAnalysisPayload";
import { extractJson } from "@/lib/ai/extractJson";
import {
  fallbackPropertyAnalysis,
  mapPropertyAnalysisResponse,
} from "@/lib/ai/mapPropertyAnalysisResponse";
import { PROPERTY_ANALYSIS_SYSTEM } from "@/lib/ai/prompts/propertyAnalysis";
import { aiProvider, hasAIProviderKey } from "@/lib/ai/provider";
import type { AIPropertyAnalysisDTO } from "@/lib/dto/AIPropertyAnalysisDTO";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { PropertyAiAnalysisRepository } from "@/lib/repositories/PropertyAiAnalysisRepository";
import { PropertyService } from "@/lib/services/PropertyService";

async function runPropertyAnalysis(
  property: PropertyDTO,
): Promise<AIPropertyAnalysisDTO> {
  const payload = buildPropertyAnalysisPayload(property);

  if (!hasAIProviderKey()) {
    return fallbackPropertyAnalysis(payload);
  }

  try {
    const response = await aiProvider.complete({
      system: PROPERTY_ANALYSIS_SYSTEM,
      user: JSON.stringify(payload),
    });

    const parsed = JSON.parse(extractJson(response.text));

    return mapPropertyAnalysisResponse(parsed);
  } catch {
    return fallbackPropertyAnalysis(payload);
  }
}

async function loadOrCreateAnalysis(
  propertyId: string,
): Promise<AIPropertyAnalysisDTO | null> {
  const existing =
    await PropertyAiAnalysisRepository.getByPropertyId(propertyId);

  if (existing) {
    return PropertyAiAnalysisRepository.toDTO(existing);
  }

  const property = await PropertyService.getProperty(propertyId);

  if (!property) {
    return null;
  }

  const analysis = await runPropertyAnalysis(property);

  try {
    await PropertyAiAnalysisRepository.upsert(
      propertyId,
      analysis,
      process.env.AI_PROVIDER ?? "openai",
    );
  } catch {
    // Analysis still returned even if persistence fails (e.g. table not migrated yet).
  }

  return analysis;
}

export class AIPropertyAnalysisService {
  static getAnalysis = unstable_cache(
    async (propertyId: string): Promise<AIPropertyAnalysisDTO | null> => {
      return loadOrCreateAnalysis(propertyId);
    },
    ["property-analysis"],
    {
      revalidate: 3600,
      tags: ["property-analysis"],
    },
  );

  static async analyze(
    property: PropertyDTO,
  ): Promise<AIPropertyAnalysisDTO> {
    const existing =
      await PropertyAiAnalysisRepository.getByPropertyId(property.id);

    if (existing) {
      return PropertyAiAnalysisRepository.toDTO(existing);
    }

    const analysis = await runPropertyAnalysis(property);

    try {
      await PropertyAiAnalysisRepository.upsert(
        property.id,
        analysis,
        process.env.AI_PROVIDER ?? "openai",
      );
    } catch {
      // Keep response even if DB write fails.
    }

    return analysis;
  }
}
