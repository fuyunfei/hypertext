export interface DeepSeekConfig {
  apiKey: string;
  baseURL?: string;
}

export interface KeywordExtractionResult {
  keywords: string[];
}

export interface DeepSeekResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
} 