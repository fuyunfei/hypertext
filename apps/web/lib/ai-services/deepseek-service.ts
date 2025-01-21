import OpenAI from "openai";

export interface KeywordExtractionResult {
  keywords: string[];
}

interface KeywordInsightResult {
  insights: string[];
}

export class DeepSeekService {
  private client: OpenAI;
  private static instance: DeepSeekService;

  private constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
  }

  public static getInstance(): DeepSeekService {
    if (!DeepSeekService.instance) {
      DeepSeekService.instance = new DeepSeekService();
    }
    return DeepSeekService.instance;
  }

  private async createChatCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
    },
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: options?.temperature || 0.3,
        max_tokens: options?.max_tokens || 2000,
        response_format: { type: "json_object" },
      });

      console.log("origin response = ", response);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("API 返回内容为空");
      }

      return content;
    } catch (error) {
      console.error("DeepSeek API 调用失败:", error);
      throw new Error("关键词提取失败");
    }
  }

  /**
   * 从文本中提取关键词
   * @param text 输入文本
   * @returns 关键词列表
   */
  async extractKeywords(text: string): Promise<any> {
    const systemPrompt = `你是一个专业的文本分析助手。请从给定的文本中提取关键词。
    要求：
    1. 只返回关键词数组，格式为 JSON
    2. 关键词数量控制在 3-7 个
    3. 每个关键词长度不超过 4 个汉字或 8 个英文字符
    4. 关键词应该反映文本的核心主题和重要概念`;

    const userPrompt = `请分析以下文本并提取关键词：\n${text}`;

    console.log(userPrompt);

    try {
      const response = await this.createChatCompletion(systemPrompt, userPrompt);
      console.log("response = ", response);
      const result = JSON.parse(response);
      console.log("result = ", result);

      return result;
    } catch (error) {
      console.error("关键词提取失败:", error);
      return null;
    }
  }

  async generateKeywordInsights(keyword: string, context: string): Promise<KeywordInsightResult> {
    const systemPrompt = `你是一个专业的内容分析助手。你的任务是基于给定的关键词和上下文，生成5个有见地的问题或探讨点。
   这些问题应该：
    - 深入探讨关键词的核心概念
    - 涉及其影响、意义、历史背景等多个维度
    - 具有思考性和启发性
    - 问题应该简洁明了，每个问题不超过30个字`;

    const userPrompt = `关键词：${keyword}\n上下文：${context}\n请生成5个关于这个关键词的深度问题或探讨点。以JSON数组格式返回，只返回问题列表，不要其他内容。`;

    try {
      const response = await this.createChatCompletion(systemPrompt, userPrompt, { temperature: 0.7 });

      const insights = JSON.parse(response) as string[];
      return { insights };
    } catch (error) {
      console.error("Failed to generate keyword insights:", error);
      throw new Error("Failed to generate keyword insights");
    }
  }
}
