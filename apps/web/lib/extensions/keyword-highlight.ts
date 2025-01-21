import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

interface KeywordHighlightOptions {
  keywords: string[];
  color?: string;
  onHover?: (keyword: string, event: MouseEvent) => void;
  onLeave?: () => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    keywordHighlight: {
      setKeywords: (keywords: string[]) => ReturnType;
      clearKeywords: () => ReturnType;
    };
  }
}

export const KeywordHighlight = Extension.create<KeywordHighlightOptions>({
  name: "keywordHighlight",

  addOptions() {
    return {
      keywords: [],
      color: "#fef08a", // 默认使用淡黄色背景
      onHover: undefined,
      onLeave: undefined,
    };
  },

  addCommands() {
    return {
      setKeywords:
        (keywords) =>
        ({ editor }) => {
          this.options.keywords = keywords;
          editor.view.dispatch(editor.state.tr);
          return true;
        },
      clearKeywords:
        () =>
        ({ editor }) => {
          this.options.keywords = [];
          editor.view.dispatch(editor.state.tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("keyword-highlight");

    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];

            if (this.options.keywords.length === 0) {
              return DecorationSet.empty;
            }

            const keywords = this.options.keywords.map((keyword) => keyword.toLowerCase());

            doc.descendants((node, pos) => {
              if (node.isText) {
                const text = node.text?.toLowerCase() || "";
                keywords.forEach((keyword) => {
                  let index = text.indexOf(keyword);
                  while (index !== -1) {
                    decorations.push(
                      Decoration.inline(pos + index, pos + index + keyword.length, {
                        style: `background-color: ${this.options.color}; cursor: pointer;`,
                        class: "keyword-highlight",
                        "data-keyword": this.options.keywords[keywords.indexOf(keyword)],
                      }),
                    );
                    index = text.indexOf(keyword, index + keyword.length);
                  }
                });
              }
            });

            return DecorationSet.create(doc, decorations);
          },
          handleDOMEvents: {
            mouseover: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains("keyword-highlight")) {
                const keyword = target.getAttribute("data-keyword");
                if (keyword && this.options.onHover) {
                  event.preventDefault();
                  event.stopPropagation();
                  this.options.onHover(keyword, event);
                }
              }
              return false;
            },
            mouseout: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains("keyword-highlight") && this.options.onLeave) {
                event.preventDefault();
                event.stopPropagation();
                this.options.onLeave();
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
