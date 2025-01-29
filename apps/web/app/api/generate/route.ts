import { DeepSeekService } from "@/lib/ai-services/deepseek-service";
import { NextResponse } from "next/server";

// IMPORTANT! Set the runtime to edge: https://vercel.com/docs/functions/edge-functions/edge-runtime
// export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const deepseekService = DeepSeekService.getInstance();
    const result = await deepseekService.generateShortArticle(prompt);

    return NextResponse.json(result);
  } catch (error) {
    console.error("生成短文失败:", error);
    return NextResponse.json({ error: "Failed to generate article" }, { status: 500 });
  }
}
