import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

declare global {
  interface Window {
    isTooltipVisibleRef: boolean;
  }
}

interface KeywordTooltipProps {
  keyword: string;
  insights: string[];
  position: { x: number; y: number };
  onClose: () => void;
  editor: Editor | null;
  isTooltipVisibleRef: { current: boolean };
  onInsightSelect?: (insight: string) => void;
}

export const KeywordTooltip: React.FC<KeywordTooltipProps> = ({
  keyword,
  insights = [],
  position,
  onClose,
  editor,
  isTooltipVisibleRef,
  onInsightSelect,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("insights = ", insights);
    console.log("提示框渲染数据:", {
      keyword,
      insights,
      insightsLength: insights.length,
    });
  }, [keyword, insights]);

  const handleInsightClick = (insight: string) => {
    if (!editor) return;

    // 先清空编辑器内容
    editor.commands.clearContent();

    // 调用新的回调函数
    if (onInsightSelect) {
      onInsightSelect(insight);
    }

    // 保留原有的功能
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertContent(`\n${insight}`);
    editor.commands.focus();
  };

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-lg p-4 max-w-sm"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
      }}
      onMouseEnter={() => {
        isTooltipVisibleRef.current = true;
      }}
      onMouseLeave={() => {
        isTooltipVisibleRef.current = false;
        onClose();
      }}
    >
      <div className="text-sm font-medium mb-2">{keyword}</div>
      <div className="space-y-1">
        {insights.length === 0 ? (
          <div className="text-sm text-gray-500">暂无相关探讨点</div>
        ) : (
          insights.map((insight) => (
            <button
              key={`insight-${insight}`}
              type="button"
              onClick={() => handleInsightClick(insight)}
              className="w-full text-left text-sm px-2 py-1 hover:bg-gray-50 rounded"
            >
              {insight}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
};
