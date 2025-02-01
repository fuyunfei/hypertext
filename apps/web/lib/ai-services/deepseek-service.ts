import OpenAI from "openai";

export const DEFAULT_SYSTEM_PROMPT = `You are a professor writing Medium blog posts. Based on user queries, provide your insights and key content analysis following these specifications:

1. Content Requirements
- Length: no more than {maxWords} words
- Style: Professional, in-depth, logically structured
- Format: Markdown but do not use h1 h2.
- Format: use h3 h4 h5 bold italic table bullet list quote etc to format the content to make it more readable.

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
Please respond in JSON format with the following structure:
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

IMPORTANT: The content should be no more than {maxWords} words long , reponse in the language of the user query`;

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

  async generateShortArticle(prompt: string, options: GenerateOptions = {}): Promise<ArticleGenerationResult> {
    const { maxWords = 300, model = "mixtral-8x7b-32768", systemPrompt } = options;

    const finalSystemPrompt = (systemPrompt || DEFAULT_SYSTEM_PROMPT).replace(/\{maxWords\}/g, maxWords.toString());

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: `${prompt}\n\nPlease provide your response in JSON format.` },
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
