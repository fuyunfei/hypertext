"use client";

import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { Button } from "@/components/tailwind/ui/button";
import { Input } from "@/components/tailwind/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/tailwind/ui/select";
import { Slider } from "@/components/tailwind/ui/slider";
import { Textarea } from "@/components/tailwind/ui/textarea";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/ai-services/deepseek-service";
import { Settings2, Wand2 } from "lucide-react";
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

const AVAILABLE_MODELS = [
  { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  { value: "llama2-70b-4096", label: "Llama2 70B" },
  { value: "deepseek-r1-distill-llama-70b", label: "DeepSeek 70B" },
  { value: "llama-3.3-70b-specdec", label: "Llama 3.3 70B" },
  { value: "llama-3.2-3b-preview", label: "Llama 3.2 3B" },
  { value: "gemma-7b-it", label: "Gemma 7B" },
] as const;

export default function Page() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editor, setEditor] = useState<EditorInstance | null>(null);
  const [prompt, setPrompt] = useState("");
  const [wordCount, setWordCount] = useState([300]); // 默认300字
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].value);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [showSettings, setShowSettings] = useState(false);

  // 重置系统提示词
  const handleResetSystemPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  };

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
        body: JSON.stringify({
          prompt,
          maxWords: wordCount[0],
          model: selectedModel,
          systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`生成失败: ${response.statusText}`);
      }

      const result = await response.json();

      // Validate response structure
      if (!result.content || !Array.isArray(result.keywords) || !result.insights) {
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
    <div className="flex min-h-screen">
      {/* 侧边栏设置面板 */}
      <div
        className={`w-80 border-r bg-gray-50 dark:bg-gray-900 p-4 transition-all duration-300 ${showSettings ? "translate-x-0" : "-translate-x-full"} fixed left-0 top-0 h-full overflow-y-auto`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">设置</h3>
            <Button
              onClick={() => setShowSettings(false)}
              variant="ghost"
              size="sm"
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <span className="sr-only">关闭</span>×
            </Button>
          </div>

          {/* 模型选择 */}
          <div className="space-y-2">
            <span className="text-sm text-gray-500">模型:</span>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue defaultValue={selectedModel}>
                  {AVAILABLE_MODELS.find((model) => model.value === selectedModel)?.label || "选择模型"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 字数调节 */}
          <div className="space-y-2">
            <span className="text-sm text-gray-500">字数限制:</span>
            <div className="flex items-center gap-2">
              <Slider
                value={wordCount}
                onValueChange={setWordCount}
                max={1000}
                min={100}
                step={50}
                className="flex-1"
              />
              <span className="text-sm text-gray-500 min-w-[3rem] text-right">{wordCount[0]}字</span>
            </div>
          </div>

          {/* System Prompt 编辑 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">系统提示词:</span>
              <Button onClick={handleResetSystemPrompt} variant="outline" size="sm" className="text-xs">
                重置为默认值
              </Button>
            </div>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              placeholder="输入系统提示词..."
            />
            <p className="text-xs text-gray-500">提示：使用 {"{maxWords}"} 作为字数限制的占位符</p>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className={`flex-1 transition-all duration-300 ${showSettings ? "ml-80" : "ml-0"}`}>
        <div className="flex flex-col items-center gap-4 py-4 px-5">
          <div className="w-full max-w-screen-lg">
            <div className="flex flex-col gap-4 border-b pb-4">
              {/* 顶部工具栏 */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative group">
                  <Input
                    placeholder="输入提示词生成短文..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full transition-all duration-300 ease-in-out focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400"
                  />
                  <div className="absolute inset-0 border border-transparent rounded-lg transition-all duration-300 group-hover:border-gray-300 pointer-events-none" />
                </div>

                <Button
                  onClick={() => setShowSettings(!showSettings)}
                  variant="secondary"
                  className="px-4 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  设置
                </Button>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="px-4 h-10 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wand2 className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
                  {isGenerating ? (
                    <div className="flex items-center">
                      <span className="animate-pulse">生成中</span>
                      <span className="flex space-x-1 ml-1">
                        <span
                          className="w-1 h-1 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1 h-1 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1 h-1 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </span>
                    </div>
                  ) : (
                    "生成短文"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="w-full max-w-screen-lg">
            <TailwindAdvancedEditor onEditorReady={setEditor} onInsightSelect={handleInsightSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
