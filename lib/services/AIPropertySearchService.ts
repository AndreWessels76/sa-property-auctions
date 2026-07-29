import { extractJson } from "@/lib/ai/extractJson";
import { mapPropertySearchResponse } from "@/lib/ai/mapPropertySearchResponse";
import { normalizeSearchQuery } from "@/lib/ai/normalizeSearchQuery";
import { parsePropertySearchQuery } from "@/lib/ai/parsePropertySearchQuery";
import { PROPERTY_SEARCH_SYSTEM } from "@/lib/ai/prompts/propertySearch";
import { aiProvider, hasAIProviderKey } from "@/lib/ai/provider";
import type { AISearchDTO } from "@/lib/dto/AISearchDTO";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { SearchResult } from "@/lib/dto/SearchResult";
import { PropertyService } from "@/lib/services/PropertyService";

export class AIPropertySearchService {
  static async parse(query: string): Promise<AISearchDTO> {
    const trimmed = normalizeSearchQuery(query);

    if (!trimmed || !hasAIProviderKey()) {
      return parsePropertySearchQuery(trimmed);
    }

    try {
      const response = await aiProvider.complete({
        system: PROPERTY_SEARCH_SYSTEM,
        user: trimmed,
      });

      const parsed = JSON.parse(extractJson(response.text));

      return mapPropertySearchResponse(trimmed, parsed);
    } catch {
      return parsePropertySearchQuery(trimmed);
    }
  }

  static async search(query: string): Promise<SearchResult<PropertyDTO>> {
    const ai = await this.parse(query);

    return PropertyService.search(ai.filters);
  }
}
