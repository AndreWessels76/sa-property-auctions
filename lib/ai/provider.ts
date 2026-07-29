import type { AIProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic-provider";
import { GeminiProvider } from "./providers/gemini-provider";
import { OpenAIProvider } from "./providers/openai-provider";

export function createAIProvider(): AIProvider {
  switch (process.env.AI_PROVIDER) {
    case "gemini":
      return new GeminiProvider();

    case "anthropic":
      return new AnthropicProvider();

    default:
      return new OpenAIProvider();
  }
}

export const aiProvider = createAIProvider();

export function hasAIProviderKey(): boolean {
  switch (process.env.AI_PROVIDER) {
    case "gemini":
      return Boolean(process.env.GEMINI_API_KEY);

    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);

    default:
      return Boolean(process.env.OPENAI_API_KEY);
  }
}
