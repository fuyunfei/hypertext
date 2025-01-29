"use client";

import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { Button } from "@/components/tailwind/ui/button";
import { Input } from "@/components/tailwind/ui/input";
import Menu from "@/components/tailwind/ui/menu";
import { Wand2 } from "lucide-react";
import Link from "next/link";
import type { EditorInstance } from "novel";
import { useState } from "react";
import { toast } from "sonner";

interface NovelContent {
  type: string;
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

interface KeywordResponse {
  keywords: string[];
}

interface GenerateResponse {
  content: string;
  keywords: string[];
  insights: string[];
}

export default function Page() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editor, setEditor] = useState<EditorInstance | null>(null);
  const [prompt, setPrompt] = useState("");

  const handleInsightSelect = (insight: string) => {
    setPrompt(insight);
    handleGenerate();
  };

  const handleGenerate = async () => {
    try {
      if (!editor || !prompt) {
        toast.error("请先输入提示词");
        return;
      }

      setIsGenerating(true);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`生成失败: ${response.statusText}`);
      }

      const result = await response.json();

      // Validate response structure
      if (!result.content || !Array.isArray(result.keywords) || !Array.isArray(result.insights)) {
        throw new Error("服务器返回数据格式错误");
      }

      // 清空编辑器内容
      editor.commands.clearContent();

      // 插入生成的内容
      editor.commands.insertContent(result.content);

      // 触发关键词高亮事件
      const event = new CustomEvent("highlight-keywords", {
        detail: {
          keywords: result.keywords,
          context: result.content,
          insights: result.insights,
        },
      });
      window.dispatchEvent(event);

      // Show success message
      toast.success("内容生成成功");

    } catch (error) {
      console.error("生成失败:", error);
      // Show error message to user
      toast.error(error instanceof Error ? error.message : "生成内容时发生错误，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtractKeywords = async () => {
    try {
      if (!editor) {
        console.log("编辑器状态:", { editor, isExtracting });
        console.error("编辑器实例未初始化");
        return;
      }

      setIsExtracting(true);
      const jsonContent = editor.getJSON();

      const textContent = (jsonContent.content as NovelContent[]).reduce((acc, node) => {
        if (node.type === "paragraph" && node.content) {
          return `${acc} ${node.content.map((c) => c.text || "").join("")}`;
        }
        return acc;
      }, "");

      const response = await fetch("/api/extract-keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: textContent }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract keywords: ${response.statusText}`);
      }

      const result = (await response.json()) as KeywordResponse;

      if (!Array.isArray(result.keywords)) {
        throw new Error("Invalid keywords format received");
      }

      // 存储文本内容
      const textEvent = new CustomEvent("store-text-content", {
        detail: { text: textContent },
      });
      window.dispatchEvent(textEvent);

      // 触发关键词高亮事件
      const event = new CustomEvent("highlight-keywords", {
        detail: {
          keywords: result.keywords,
          context: textContent,
        },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("提取关键词失败:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 py-4 sm:px-5">
      <div className="flex w-full max-w-screen-lg items-center gap-2 px-4 sm:mb-[calc(20vh)]">
        {/* <Dialog>
          <DialogTrigger asChild>
            <Button className="ml gap-2">
              <BookOpen className="h-4 w-4" />
              Usage in dialog
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-w-3xl h-[calc(100vh-24px)]">
            <ScrollArea className="max-h-screen">
              <TailwindAdvancedEditor />
            </ScrollArea>
          </DialogContent>
        </Dialog> */}
        {/* <Link href="/docs" className="ml-auto">
          <Button variant="ghost">Documentation</Button>
        </Link>
        <Menu /> */}
      </div>

      <div className="w-full max-w-screen-lg px-4 mb-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <div className="flex-1">
            <Input
              placeholder="输入提示词生成短文..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full"
            />
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt} className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            {isGenerating ? <span className="animate-pulse">生成中...</span> : "生成短文"}
          </Button>
          {/* <Button onClick={handleExtractKeywords} disabled={isExtracting} className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {isExtracting ? "提取中..." : "提取关键词"}
          </Button> */}
        </div>
      </div>

      <div className="w-full max-w-screen-lg">
        <TailwindAdvancedEditor onEditorReady={setEditor} onInsightSelect={handleInsightSelect} />
      </div>
    </div>
  );
}
