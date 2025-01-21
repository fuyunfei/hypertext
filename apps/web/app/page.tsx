"use client";

import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { Button } from "@/components/tailwind/ui/button";
import Menu from "@/components/tailwind/ui/menu";
import { GithubIcon, KeyRound } from "lucide-react";
import Link from "next/link";
import type { EditorInstance } from "novel";
import { useState } from "react";

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

export default function Page() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [editor, setEditor] = useState<EditorInstance | null>(null);

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

      console.log("result = ", result);
      if (!Array.isArray(result.keywords)) {
        throw new Error("Invalid keywords format received");
      }
      console.log("result = ", result);

      // 存储文本内容
      const textEvent = new CustomEvent("store-text-content", {
        detail: { text: textContent },
      });
      window.dispatchEvent(textEvent);

      // 触发关键词高亮事件，同时传递文本内容
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
        <Button size="icon" variant="outline">
          <a href="https://github.com/steven-tey/novel" target="_blank" rel="noreferrer">
            <GithubIcon />
          </a>
        </Button>
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
        <Link href="/docs" className="ml-auto">
          <Button variant="ghost">Documentation</Button>
        </Link>
        <Menu />
      </div>

      <div className="w-full max-w-screen-lg px-4 mb-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Button onClick={handleExtractKeywords} disabled={isExtracting} className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {isExtracting ? "提取中..." : "提取关键词"}
          </Button>
        </div>
      </div>

      <div className="w-full max-w-screen-lg">
        <TailwindAdvancedEditor onEditorReady={setEditor} />
      </div>
    </div>
  );
}
