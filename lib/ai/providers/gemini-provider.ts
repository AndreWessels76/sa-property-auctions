import { GoogleGenerativeAI } from "@google/generative-ai";

import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
} from "../types";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI | null = null;

  private getClient(): GoogleGenerativeAI {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    if (!this.client) {
      this.client = new GoogleGenerativeAI(apiKey);
    }

    return this.client;
  }

  async complete(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const model = this.getClient().getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      systemInstruction: request.system,
      generationConfig: {
        temperature: request.temperature ?? 0,
      },
    });

    const result = await model.generateContent(request.user);
    const text = result.response.text();

    return { text };
  }
}
