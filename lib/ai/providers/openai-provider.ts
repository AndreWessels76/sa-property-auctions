import OpenAI from "openai";

import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
} from "../types";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    if (!this.client) {
      this.client = new OpenAI({ apiKey });
    }

    return this.client;
  }

  async complete(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const response = await this.getClient().chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: request.temperature ?? 0,
      messages: [
        {
          role: "system",
          content: request.system,
        },
        {
          role: "user",
          content: request.user,
        },
      ],
    });

    return {
      text: response.choices[0]?.message?.content ?? "",
    };
  }
}
