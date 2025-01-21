import { DeepSeekService } from "@/lib/ai-services/deepseek-service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { keyword, context } = await request.json();

    if (!keyword || !context) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const deepseekService = DeepSeekService.getInstance({
      apiKey: process.env.DEEPSEEK_API_KEY || "",
    });

    const result = await deepseekService.generateKeywordInsights(keyword, context);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating keyword insights:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
