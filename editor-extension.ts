import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import type BeautifulMermaidPlugin from "./main";

/**
 * ViewPlugin that intercepts Obsidian's native mermaid renders in Live Preview
 * and replaces their SVG content with beautiful-mermaid's rendering.
 *
 * This preserves native editing behavior — clicking a code block shows editable
 * code, clicking away shows the beautiful-mermaid diagram.
 */
export function buildMermaidExtension(plugin: BeautifulMermaidPlugin): Extension {
  return ViewPlugin.fromClass(
    class {
      private observer: MutationObserver;
      private rendered = new WeakMap<HTMLElement, string>();

      constructor(private view: EditorView) {
        this.observer = new MutationObserver(() => this.processEmbeds());
        this.observer.observe(view.dom, { childList: true, subtree: true });
        requestAnimationFrame(() => this.processEmbeds());
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          requestAnimationFrame(() => this.processEmbeds());
        }
      }

      /** Find native mermaid embeds and replace their SVGs with beautiful-mermaid */
      private processEmbeds() {
        const embeds = this.view.dom.querySelectorAll<HTMLElement>(
          ".cm-embed-block.cm-lang-mermaid",
        );

        for (const embed of embeds) {
          const mermaidDiv = embed.querySelector<HTMLElement>(":scope > .mermaid");
          if (!mermaidDiv) continue;

          const source = this.extractSource(embed);
          if (!source) continue;

          // Skip if already rendered with same source
          if (this.rendered.get(mermaidDiv) === source) continue;
          this.rendered.set(mermaidDiv, source);

          // Replace native SVG with beautiful-mermaid rendering
          plugin.renderInto(source, mermaidDiv);
        }
      }

      /** Extract mermaid source code from the document at the embed's position */
      private extractSource(embed: HTMLElement): string | null {
        try {
          const pos = this.view.posAtDOM(embed);
          const doc = this.view.state.doc;
          const line = doc.lineAt(pos);

          // Search backward for the opening fence
          let startLine = -1;
          for (let i = line.number; i >= 1; i--) {
            const text = doc.line(i).text.trimStart();
            if (text.startsWith("```mermaid") || text.startsWith("~~~mermaid")) {
              startLine = i;
              break;
            }
          }
          if (startLine === -1) return null;

          // Search forward for the closing fence
          const fence = doc.line(startLine).text.trimStart().substring(0, 3);
          let endLine = -1;
          for (let i = startLine + 1; i <= doc.lines; i++) {
            if (doc.line(i).text.trimStart().startsWith(fence)) {
              endLine = i;
              break;
            }
          }
          if (endLine === -1) return null;

          const lines: string[] = [];
          for (let i = startLine + 1; i < endLine; i++) {
            lines.push(doc.line(i).text);
          }
          return lines.join("\n").trim();
        } catch {
          return null;
        }
      }

      destroy() {
        this.observer.disconnect();
      }
    },
  );
}
