"use client";

import { useEffect, useRef, useState } from "react";
import { getStoredSessionId } from "@/lib/api/client";
import type { Annotation } from "@/lib/api/types";

export type PositionData = {
  version: 1;
  pages: { pageNumber: number; rects: { left: number; top: number; width: number; height: number }[] }[];
};

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function pageHasText(items: readonly unknown[]): boolean {
  return items.some((item) => {
    if (typeof item !== "object" || item === null || !("str" in item)) return false;
    const value = (item as { str?: unknown }).str;
    return typeof value === "string" && value.trim().length > 0;
  });
}

function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d");
  if (!context || canvas.width === 0 || canvas.height === 0) return true;
  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return true;
  }
  const stride = 4;
  let dark = 0;
  for (let y = 0; y < canvas.height; y += stride) {
    const row = y * canvas.width * 4;
    for (let x = 0; x < canvas.width; x += stride) {
      const index = row + x * 4;
      if (pixels[index] < 248 || pixels[index + 1] < 248 || pixels[index + 2] < 248) {
        dark += 1;
        if (dark > 8) return true;
      }
    }
  }
  return false;
}

function paintHighlight(container: HTMLElement, position: PositionData, className: string) {
  for (const page of position.pages) {
    const pageEl = container.querySelector(`#pdf-page-${page.pageNumber} .highlight-layer`);
    if (!pageEl) continue;
    for (const rect of page.rects) {
      const mark = document.createElement("div");
      mark.className = className;
      mark.style.left = `${rect.left * 100}%`;
      mark.style.top = `${rect.top * 100}%`;
      mark.style.width = `${rect.width * 100}%`;
      mark.style.height = `${rect.height * 100}%`;
      pageEl.append(mark);
    }
  }
}

export function selectionToPosition(container: HTMLElement): { text: string; pageNumber: number; position: PositionData } | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }
  const text = selection.toString().trim();
  if (!text) return null;
  const range = selection.getRangeAt(0);
  const grouped = new Map<number, PositionData["pages"][number]["rects"]>();
  for (const rect of Array.from(range.getClientRects())) {
    if (rect.width === 0 || rect.height === 0) continue;
    const page = document.elementsFromPoint(rect.left + 1, rect.top + 1).find((el) =>
      el instanceof HTMLElement && el.classList.contains("pdf-page") && container.contains(el),
    ) as HTMLElement | undefined;
    if (!page) continue;
    const pageNumber = Number(page.dataset.pageNumber);
    const box = page.getBoundingClientRect();
    const item = {
      left: clamp01(round6((rect.left - box.left) / box.width)),
      top: clamp01(round6((rect.top - box.top) / box.height)),
      width: clamp01(round6(rect.width / box.width)),
      height: clamp01(round6(rect.height / box.height)),
    };
    const list = grouped.get(pageNumber) ?? [];
    list.push(item);
    grouped.set(pageNumber, list);
  }
  if (grouped.size === 0) return null;
  const pages = [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pageNumber, rects]) => ({ pageNumber, rects }));
  return { text: text.slice(0, 2000), pageNumber: pages[0].pageNumber, position: { version: 1, pages } };
}

export function PdfPages({
  url,
  zoom,
  annotations,
  activeId,
  pending,
  onReady,
  onError,
}: {
  url: string;
  zoom: number;
  annotations: Annotation[];
  activeId: number | null;
  pending: PositionData | null;
  onReady: (pageCount: number) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading PDF…");
  const [pagesReady, setPagesReady] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let loadingTask: ReturnType<(typeof import("pdfjs-dist"))["getDocument"]> | null = null;
    const renderTasks: { cancel(): void }[] = [];

    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        setStatus("Loading PDF…");
        const headers = new Headers({ Accept: "application/pdf" });
        const sessionId = getStoredSessionId();
        if (sessionId) {
          headers.set("X-Auth-Session", sessionId);
          headers.set("Authorization", `Bearer ${sessionId}`);
        }
        const pdfResponse = await fetch(url, { credentials: "include", headers });
        if (!pdfResponse.ok) {
          throw new Error(String(pdfResponse.status));
        }
        const data = new Uint8Array(await pdfResponse.arrayBuffer());
        loadingTask = pdfjs.getDocument({
          data,
          verbosity: 0,
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          wasmUrl: "/pdfjs/wasm/",
          iccUrl: "/pdfjs/iccs/",
        });
        const pdf = await loadingTask.promise;
        if (cancelled || !container) return;
        const optionalContent = await pdf.getOptionalContentConfig();
        for (const [id, group] of optionalContent) {
          if (group.visible === false) {
            optionalContent.setVisibility(id, true, false);
          }
        }
        const optionalContentConfigPromise = Promise.resolve(optionalContent);
        onReady(pdf.numPages);
        container.replaceChildren();
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;
          const scale = zoom / 100;
          const viewport = page.getViewport({ scale });
          const pageEl = document.createElement("div");
          pageEl.className = "pdf-page";
          pageEl.dataset.pageNumber = String(pageNumber);
          pageEl.style.width = `${viewport.width}px`;
          pageEl.style.height = `${viewport.height}px`;
          pageEl.id = `pdf-page-${pageNumber}`;

          const canvas = document.createElement("canvas");
          const outputScale = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
          const renderTask = page.render({ canvas, viewport, transform, optionalContentConfigPromise });
          renderTasks.push(renderTask);
          await renderTask.promise;

          const textLayerDiv = document.createElement("div");
          textLayerDiv.className = "textLayer";
          textLayerDiv.style.setProperty("--total-scale-factor", String(scale));
          textLayerDiv.style.setProperty("--scale-round-x", "1px");
          textLayerDiv.style.setProperty("--scale-round-y", "1px");
          const textContent = await page.getTextContent();
          const textLayer = new pdfjs.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          await textLayer.render();
          if (pageHasText(textContent.items) && !canvasHasInk(canvas)) {
            pageEl.classList.add("ink-fallback");
          }

          const highlight = document.createElement("div");
          highlight.className = "highlight-layer";
          pageEl.append(canvas, textLayerDiv, highlight);
          container.append(pageEl);
        }
        setStatus("");
        setPagesReady((count) => count + 1);
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to render the PDF.";
          onError(message);
          setStatus("");
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
      renderTasks.forEach((task) => {
        try {
          task.cancel();
        } catch {
          // ignore
        }
      });
      if (loadingTask) {
        void loadingTask.destroy();
      }
      container.replaceChildren();
    };
  }, [url, zoom, onReady, onError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll(".highlight-rect").forEach((node) => node.remove());
    for (const annotation of annotations) {
      let position: PositionData | null = null;
      try {
        position = JSON.parse(annotation.positionData) as PositionData;
      } catch {
        position = null;
      }
      if (!position?.pages) continue;
      paintHighlight(container, position, annotation.id === activeId ? "highlight-rect is-active" : "highlight-rect");
    }
    if (pending?.pages) {
      paintHighlight(container, pending, "highlight-rect is-pending");
    }
  }, [annotations, activeId, pending, pagesReady]);

  return (
    <div>
      {status ? <p className="muted">{status}</p> : null}
      <div ref={containerRef} className="pdf-pages" />
    </div>
  );
}
