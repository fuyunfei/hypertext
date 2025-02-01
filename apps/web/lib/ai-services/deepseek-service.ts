import OpenAI from "openai";
import type { QuestionAnswerResult } from "./types";

export const DEFAULT_SYSTEM_PROMPT = `You are a professor writing Medium blog posts. Based on user queries, provide your insights and key content analysis following these specifications:

1. Content Requirements
- Length: no more than {maxWords} words
- Style: Professional, in-depth, logically structured
- Format: Markdown but do not use h1.
- Format: use h2 h3 bold italic table bullet list quote etc to format the content to make it more readable.

2. Key Content
- Extract 5 key contents
- Focus on:
  * Deep conceptual understanding or complex issues
  * High information entropy content
  * Avoid basic concepts (e.g., management, efficiency, innovation)

3. Following Questions Requirements
- Generate 3 discussion questions for each keycontent
- Questions must:
  * Present complex, highly valuable inquiries
  * Avoid superficial or cliché topics
  * Maintain tight correlation with both keywords and main theme
  * Demonstrate deep conceptual connections

4. Response Format (JSON)
{
  "content": "Markdown formatted blog post...",
  "keywords": ["keycontent 1", "keycontent 2", "keycontent 3", "keycontent 4", "keycontent 5"],
  "insights": {
    "keycontent 1": [
      "following question 1",
      "following question 2",
      "following question 3"
    ],
    "keycontent 2": [
      "following question 1",
      "following question 2",
      "following question 3"
    ],
    // ... and so on for all 5 keywords
  }
}

IMPORTANT: The content no more than {maxWords} words long, use markdown to format the content.`;

export interface KeywordExtractionResult {
  keywords: string[];
}

interface KeywordInsightResult {
  insights: string[];
}

interface ArticleGenerationResult {
  content: string;
  keywords: string[];
  insights: Record<string, string[]>;
}

interface GenerateOptions {
  maxWords?: number;
  model?: string;
  systemPrompt?: string;
}

export class DeepSeekService {
  private client: OpenAI;
  private static instance: DeepSeekService;

  private constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
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
        model: "deepseek-r1-distill-llama-70b",
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
      throw new Error("关键内容提取失败");
    }
  }

  /**
   * 从文本中提取关键内容
   * @param text 输入文本
   * @returns 关键内容列表
   */
  async extractkeywords(text: string): Promise<KeywordExtractionResult> {
    const systemPrompt = `你是一个专业的文本分析助手。请从给定的文本中提取关键内容。
    要求：
    1. 只返回关键内容数组，格式为 JSON
    2. 关键内容数量控制在 3-5 个
    3. 每个关键内容长度不超过 4 个汉字或 8 个英文字符。同时不少于3哥汉字
    4. 关键内容应该反映文本的核心主题和重要概念`;

    const userPrompt = `请分析以下文本并提取关键内容：\n${text}`;

    console.log(userPrompt);

    try {
      const response = await this.createChatCompletion(systemPrompt, userPrompt);
      console.log("response = ", response);
      const result = JSON.parse(response);
      console.log("result = ", result);

      return result;
    } catch (error) {
      console.error("关键内容提取失败:", error);
      return null;
    }
  }

  async generateKeywordInsights(keyword: string, context: string): Promise<KeywordInsightResult> {
    const systemPrompt = `你是一个专业的内容分析助手。你的任务是基于给定的关键内容和上下文，生成5个有见地的问题或探讨点。
   这些问题应该：
    - 深入探讨关键内容的核心概念
    - 涉及其影响、意义、历史背景等多个维度
    - 具有思考性和启发性
    - 问题应该简洁明了，每个问题不超过30个字`;

    const userPrompt = `关键内容：${keyword}\n上下文：${context}\n请生成5个关于这个关键内容的深度问题或探讨点。以JSON数组格式返回，只返回问题列表，不要其他内容。`;

    try {
      const response = await this.createChatCompletion(systemPrompt, userPrompt, { temperature: 0.7 });

      const insights = JSON.parse(response) as string[];
      return { insights };
    } catch (error) {
      console.error("Failed to generate keyword insights:", error);
      throw new Error("Failed to generate keyword insights");
    }
  }

  async generateQuestionAnswer(question: string): Promise<QuestionAnswerResult> {
    const systemPrompt =
      "你是一个专业的问题回答助手。请根据问题提供专业、准确、详细的回答。回答要有深度但不要过长，控制在300字以内。请以JSON格式返回，使用 answer 字段包含回答内容。";
    const userPrompt = question;

    const response = await this.createChatCompletion(systemPrompt, userPrompt, {
      temperature: 0.7,
      max_tokens: 1000,
    });

    const result = JSON.parse(response);
    return result;
  }

  async generateShortArticle(prompt: string, options: GenerateOptions = {}): Promise<ArticleGenerationResult> {
    const { maxWords = 300, model = "mixtral-8x7b-32768", systemPrompt } = options;

    const finalSystemPrompt = (systemPrompt || DEFAULT_SYSTEM_PROMPT).replace(/\{maxWords\}/g, maxWords.toString());

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      console.log("origin response = ", response);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("API 返回内容为空");
      }

      return JSON.parse(content) as ArticleGenerationResult;
    } catch (error) {
      console.error("Groq API 调用失败:", error);
      throw new Error("内容生成失败");
    }
  }
}
