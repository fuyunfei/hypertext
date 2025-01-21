import { DeepSeekService } from "@/lib/ai-services/deepseek-service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const deepseekService = DeepSeekService.getInstance();
    const result = await deepseekService.extractKeywords(text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("关键词提取失败:", error);
    return NextResponse.json({ error: "Failed to extract keywords" }, { status: 500 });
  }
}
