import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface KeywordData {
  id: number;
  text: string;
}

interface KeywordTooltipProps {
  keyword: string;
  position: { x: number; y: number };
  onClose: () => void;
}

// 模拟异步数据加载
const mockFetchData = async (keyword: string): Promise<KeywordData[]> => {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 返回模拟数据
  return [
    { id: 1, text: `与"${keyword}"相关的第一条解释` },
    { id: 2, text: `关于"${keyword}"的详细说明` },
    { id: 3, text: `"${keyword}"在文章中的重要性分析` },
    { id: 4, text: `"${keyword}"的上下文关联` },
  ];
};

export const KeywordTooltip: React.FC<KeywordTooltipProps> = ({ keyword, position, onClose }) => {
  const [data, setData] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await mockFetchData(keyword);
        setData(result);
      } catch (error) {
        console.error("Failed to load keyword data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [keyword]);

  const tooltipContent = (
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[300px] max-w-[400px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y + 20}px`,
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="font-bold mb-2 text-gray-800">{keyword}</div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((item) => (
            <li key={item.id} className="text-sm text-gray-600 hover:bg-gray-50 p-1 rounded">
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // 使用Portal将tooltip渲染到body的最后
  return createPortal(tooltipContent, document.body);
};
