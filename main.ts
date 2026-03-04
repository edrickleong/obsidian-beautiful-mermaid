import { Plugin, setIcon } from "obsidian";
import { renderMermaid } from "beautiful-mermaid";
import type { DiagramColors } from "beautiful-mermaid";
import { buildMermaidExtension } from "./editor-extension";

export default class BeautifulMermaidPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("mermaid", (source, el) => {
      el.empty();
      el.appendChild(this.createDiagramView(source));
    });

    this.registerEditorExtension(buildMermaidExtension(this));
  }

  getThemeColors(): DiagramColors {
    const isDark = document.body.classList.contains("theme-dark");
    return isDark ? { bg: "#18181B", fg: "#FAFAFA" } : { bg: "#FFFFFF", fg: "#27272A" };
  }

  createDiagramView(source: string): HTMLElement {
    const container = document.createElement("div");
    container.className = "beautiful-mermaid-container";

    const diagramEl = container.createDiv({ cls: "beautiful-mermaid-diagram" });

    const sourceEl = container.createEl("pre", {
      cls: "beautiful-mermaid-source",
    });
    sourceEl.style.display = "none";
    sourceEl.createEl("code", { text: source });

    const toggleBtn = container.createDiv({
      cls: "beautiful-mermaid-toggle clickable-icon",
    });
    toggleBtn.setAttribute("aria-label", "View source");
    setIcon(toggleBtn, "code");

    let showingSource = false;
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      showingSource = !showingSource;
      diagramEl.style.display = showingSource ? "none" : "";
      sourceEl.style.display = showingSource ? "" : "none";
      setIcon(toggleBtn, showingSource ? "eye" : "code");
      toggleBtn.setAttribute("aria-label", showingSource ? "View diagram" : "View source");
    });

    this.renderInto(source, diagramEl);
    return container;
  }

  async renderInto(source: string, el: HTMLElement) {
    try {
      const colors = this.getThemeColors();
      const svg = await renderMermaid(source.trim(), {
        ...colors,
        transparent: true,
      });
      el.innerHTML = svg;
      const svgEl = el.querySelector("svg");
      if (svgEl) {
        svgEl.style.maxWidth = "100%";
        svgEl.style.height = "auto";
      }
    } catch (err) {
      console.error("beautiful-mermaid: render error", err);
      el.setText("Failed to render diagram");
    }
  }

  onunload() {}
}
