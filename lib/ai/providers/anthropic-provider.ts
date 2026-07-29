import Anthropic from "@anthropic-ai/sdk";

import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
} from "../types";

export class AnthropicProvider implements AIProvider {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    if (!this.client) {
      this.client = new Anthropic({ apiKey });
    }

    return this.client;
  }

  async complete(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const response = await this.getClient().messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
      max_tokens: 1024,
      temperature: request.temperature ?? 0,
      system: request.system,
      messages: [
        {
          role: "user",
          content: request.user,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return { text };
  }
}
