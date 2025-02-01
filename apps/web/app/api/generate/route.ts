import { DeepSeekService } from "@/lib/ai-services/deepseek-service";
import { NextResponse } from "next/server";

// IMPORTANT! Set the runtime to edge: https://vercel.com/docs/functions/edge-functions/edge-runtime
// export const runtime = "edge";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt, maxWords, model, systemPrompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const service = DeepSeekService.getInstance();
    const result = await service.generateShortArticle(prompt, {
      maxWords,
      model,
      systemPrompt,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "生成失败" }, { status: 500 });
  }
}
