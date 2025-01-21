import { DeepSeekService } from "@/lib/ai-services/deepseek-service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const deepseekService = DeepSeekService.getInstance();

    const result = await deepseekService.generateQuestionAnswer(question);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating answer:", error);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
