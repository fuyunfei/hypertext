"use client";
import { defaultEditorContent } from "@/lib/content";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import { ColorSelector } from "./selectors/color-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { NodeSelector } from "./selectors/node-selector";
import { Separator } from "./ui/separator";

import { KeywordHighlight } from "@/lib/extensions/keyword-highlight";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { uploadFn } from "./image-upload";
import { KeywordTooltip } from "./keyword-tooltip";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";

const hljs = require("highlight.js");

interface TailwindAdvancedEditorProps {
  onEditorReady?: (editor: EditorInstance) => void;
}

declare global {
  interface Window {
    tooltipCloseTimer: NodeJS.Timeout | undefined;
  }
}

const TailwindAdvancedEditor = ({ onEditorReady }: TailwindAdvancedEditorProps) => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState();
  const [editor, setEditor] = useState<EditorInstance | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const [tooltipData, setTooltipData] = useState<{
    keyword: string;
    position: { x: number; y: number };
  } | null>(null);

  const isTooltipVisibleRef = useRef(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout>();

  // 添加文本内容状态
  const [storedText, setStoredText] = useState<string>("");

  // 在组件内部添加一个state来存储文章内容
  const [articleContext, setArticleContext] = useState<string>("");

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    doc.querySelectorAll("pre code").forEach((el) => {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON();
    setCharsCount(editor.storage.characterCount.words());
    window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem("novel-content", JSON.stringify(json));
    window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
    setSaveStatus("Saved");
  }, 500);

  const highlightKeywords = useCallback(
    (keywords: string[]) => {
      if (!editor) return;

      try {
        editor.commands.setKeywords(keywords);
      } catch (error) {
        console.error("Failed to highlight keywords:", error);
      }
    },
    [editor],
  );

  const handleKeywordHover = useCallback((keyword: string, event: MouseEvent) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    isTooltipVisibleRef.current = true;
    setTooltipData({
      keyword,
      position: { x: event.clientX, y: event.clientY },
    });
  }, []);

  const handleKeywordLeave = useCallback(() => {
    isTooltipVisibleRef.current = false;
    if (window.tooltipCloseTimer) {
      clearTimeout(window.tooltipCloseTimer);
    }
    window.tooltipCloseTimer = setTimeout(() => {
      if (!isTooltipVisibleRef.current) {
        setTooltipData(null);
      }
    }, 300);
  }, []);

  // 创建扩展时就传入handlers
  const extensions = useMemo(
    () => [
      ...defaultExtensions,
      slashCommand,
      KeywordHighlight.configure({
        onHover: handleKeywordHover,
        onLeave: handleKeywordLeave,
      }),
    ],
    [handleKeywordHover, handleKeywordLeave],
  );

  useEffect(() => {
    const content = window.localStorage.getItem("novel-content");
    if (content) setInitialContent(JSON.parse(content));
    else setInitialContent(defaultEditorContent);
  }, []);

  useEffect(() => {
    if (editor && onEditorReady && !isEditorReady) {
      onEditorReady(editor);
      setIsEditorReady(true);
    }
  }, [editor, onEditorReady, isEditorReady]);

  // 添加文本内容事件监听
  useEffect(() => {
    const handleStoreText = (event: CustomEvent<{ text: string }>) => {
      if (event.detail.text) {
        setStoredText(event.detail.text);
      }
    };

    window.addEventListener("store-text-content", handleStoreText as EventListener);
    return () => {
      window.removeEventListener("store-text-content", handleStoreText as EventListener);
    };
  }, []);

  // 修改关键词高亮事件监听
  useEffect(() => {
    const handleHighlightKeywords = (event: CustomEvent<{ keywords: string[]; context: string }>) => {
      if (event.detail.keywords) {
        highlightKeywords(event.detail.keywords);
        // 更新文章上下文
        setArticleContext(event.detail.context);
      }
    };

    window.addEventListener("highlight-keywords", handleHighlightKeywords as EventListener);
    return () => {
      window.removeEventListener("highlight-keywords", handleHighlightKeywords as EventListener);
    };
  }, [highlightKeywords]);

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-lg">
      <div className="flex absolute right-5 top-5 z-10 mb-5 gap-2">
        <div className="rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground">{saveStatus}</div>
        <div className={charsCount ? "rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground" : "hidden"}>
          {charsCount} Words
        </div>
      </div>
      {tooltipData && (
        <KeywordTooltip
          keyword={tooltipData.keyword}
          context={articleContext}
          position={tooltipData.position}
          onClose={() => setTooltipData(null)}
          editor={editor}
        />
      )}
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          onCreate={({ editor: editorInstance }) => {
            setEditor(editorInstance);
          }}
          onUpdate={({ editor: editorInstance }) => {
            debouncedUpdates(editorInstance);
            setSaveStatus("Unsaved");
          }}
          className="relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
            },
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />

            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default TailwindAdvancedEditor;
