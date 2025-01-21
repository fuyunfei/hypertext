import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface KeywordTooltipProps {
  keyword: string;
  context: string;
  position: { x: number; y: number };
  onClose: () => void;
  editor: Editor | null;
}

interface KeywordInsights {
  insights: string[];
}

export const KeywordTooltip: React.FC<KeywordTooltipProps> = ({ keyword, context, position, onClose, editor }) => {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/keyword-insights", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ keyword, context }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch insights");
        }

        const data: KeywordInsights = await response.json();
        setInsights(data.insights);
      } catch (err) {
        setError("Failed to load insights");
        console.error("Error fetching insights:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [keyword, context]);

  const handleInsightClick = async (insight: string) => {
    if (!editor) return;

    try {
      setLoading(true);
      const response = await fetch("/api/question-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: insight }),
      });

      if (!response.ok) {
        throw new Error("Failed to get answer");
      }

      const data = await response.json();

      // 移动到文档末尾
      editor.commands.setTextSelection(editor.state.doc.content.size);
      // 插入问题、分隔线和答案
      editor.commands.insertContent(`

---

${data.answer}

`);
      // 聚焦编辑器
      editor.commands.focus();
    } catch (err) {
      console.error("Error getting answer:", err);
      // 如果获取答案失败，仍然插入问题，同样添加额外的空行
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.insertContent(`\n\n${insight}`);
      editor.commands.focus();
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-lg p-4 max-w-md"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
      }}
      onMouseEnter={() => {
        if (window.tooltipCloseTimer) {
          clearTimeout(window.tooltipCloseTimer);
        }
      }}
      onMouseLeave={() => {
        onClose();
      }}
    >
      <div className="relative">
        <h3 className="text-lg font-semibold mb-2">{keyword}</h3>
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
          )}
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {!loading &&
            !error &&
            insights?.questions?.map((insight) => (
              <button
                type="button"
                key={`insight-${insight}`}
                className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer transition-colors"
                onClick={() => handleInsightClick(insight)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleInsightClick(insight);
                  }
                }}
              >
                {insight}
              </button>
            ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};
