import OpenAI from "openai";
import type { QuestionAnswerResult } from "./types";

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
        model: "llama-3.1-8b-instant",
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
  async extractKeywords(text: string): Promise<KeywordExtractionResult> {
    const systemPrompt = `你是一个专业的文本分析助手。请从给定的文本中提取关键词。
    要求：
    1. 只返回关键词数组，格式为 JSON
    2. 关键词数量控制在 3-5 个
    3. 每个关键词长度不超过 4 个汉字或 8 个英文字符。同时不少于3哥汉字
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

  async generateShortArticle(prompt: string): Promise<ArticleGenerationResult> {
    const systemPrompt = `你是一个专业的写作助手。请根据用户的提示生成一篇短文，并提供关键词分析。

要求：
1. 短文要求：
   - 长度为400字到800字之间
   - 内容要专业、有深度、逻辑清晰
   - 段落结构合理，易于阅读

2. 关键词要求：
   - 提取3-5个关键词或关键短语
   - 每个关键词/短语3-8个汉字
   - 关键词必须满足以下标准：
     * 具有专业性或学术价值（如：数字化转型、创新生态）
     * 体现深层概念或复杂议题（如：数据主权、算法偏见）
     * 涉及跨学科或多维度思考（如：人机协同、智能治理）
     * 避免过于简单或单一的概念（不要用：管理、效率、创新这类泛泛而谈的词）
   - 优先选择：
     * 新兴概念或前沿议题
     * 具有争议性或多元解读空间的主题
     * 能引发深度思考和讨论的领域

3. 每个关键词的探讨点要求：
   - 每个关键词生成5个探讨点
   - 探讨点必须：
     * 揭示深层规律或本质问题
     * 关注发展趋势和未来影响
     * 探讨社会、技术、伦理等多个维度
     * 提出创新视角或批判性思考
   - 每个探讨点要：
     * 言简意赅，不超过30个字
     * 具有思辨性和启发性
     * 避免表面化或陈词滥调

4. 返回格式(JSON)：
{
  "content": "文章内容...",
  "keywords": ["关键词1", "关键词2", ...],
  "insights": {
    "关键词1": ["探讨点1", "探讨点2", ...],
    "关键词2": ["探讨点1", "探讨点2", ...],
    ...
  }
}`;

    const content = await this.createChatCompletion(systemPrompt, prompt);
    return JSON.parse(content) as ArticleGenerationResult;
  }
}
