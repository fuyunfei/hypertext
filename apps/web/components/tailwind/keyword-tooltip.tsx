import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface KeywordTooltipProps {
  keyword: string;
  context: string;
  position: { x: number; y: number };
  onClose: () => void;
}

interface KeywordInsights {
  insights: string[];
}

export const KeywordTooltip: React.FC<KeywordTooltipProps> = ({ keyword, context, position, onClose }) => {
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

  console.log("insights = ", insights);

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-lg p-4 max-w-md"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
      }}
      onMouseEnter={() => {
        // 鼠标进入弹窗时，清除任何可能的关闭计时器
        if (window.tooltipCloseTimer) {
          clearTimeout(window.tooltipCloseTimer);
        }
      }}
      onMouseLeave={() => {
        // 鼠标离开弹窗时关闭
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
            insights?.questions?.map((insight, index) => (
              <div key={index} className="text-sm text-gray-700 hover:bg-gray-50 p-1 rounded">
                {insight}
              </div>
            ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};
