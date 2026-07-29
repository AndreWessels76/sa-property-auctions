export interface AICompletionRequest {
  system: string;
  user: string;
  temperature?: number;
}

export interface AICompletionResponse {
  text: string;
}

export interface AIProvider {
  complete(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse>;
}
